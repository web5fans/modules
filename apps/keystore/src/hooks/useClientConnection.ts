import { useEffect, useState } from 'react';
import { isOriginAllowed } from '../utils/storage';
import { signMessage, verifySignature, bytesToHex, hexToBytes } from '../utils/crypto';
import { getActiveKey } from '../utils/storage';

type ClientRequest = {
  source: 'keystore-client';
  origin: string;
  type: string;
  requestId: string;
  message?: string;
  didKey?: string;
  signature?: string;
};

type AuthResponse = {
  source: 'keystore-auth';
  requestId: string;
  ok: boolean;
  error?: string;
  didKey?: string;
  verified?: boolean;
  signature?: string;
}

export function useClientConnection() {
  const [hasOpener] = useState(() => !!window.opener);

  useEffect(() => {
    if (!window.opener) {
      return;
    }

    window.opener.postMessage({ source: 'keystore-auth', type: 'ready' }, '*');

    const handleMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.source !== 'keystore-client') return;

      const request = data as ClientRequest;
      if (!request.origin || !isOriginAllowed(request.origin)) return;

      const result = await processRequest(request);
      window.opener.postMessage(result, request.origin);
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return { hasOpener };
}

async function processRequest(request: ClientRequest): Promise<AuthResponse> {
  const { type, requestId } = request;

  if (type === 'PING') {
    return { source: 'keystore-auth', requestId, ok: true };
  }

  if (type === 'getDIDKey') {
    const key = getActiveKey();
    if (!key?.didKey) {
      return { source: 'keystore-auth', requestId, ok: false, error: 'no_active_key' };
    }
    return { source: 'keystore-auth', requestId, ok: true, didKey: key.didKey };
  }

  if (type === 'signMessage') {
    try {
      const key = getActiveKey();
      if (!key?.privateKey) {
        return { source: 'keystore-auth', requestId, ok: false, error: 'no_local_key' };
      }

      const messageHex = request.message;
      if (!messageHex) {
        return { source: 'keystore-auth', requestId, ok: false, error: 'empty_message' };
      }

      const msgBytes = hexToBytes(messageHex);
      const sigBytes = await signMessage(msgBytes, key.privateKey);

      return {
        source: 'keystore-auth',
        requestId,
        ok: true,
        signature: bytesToHex(sigBytes),
      };
    } catch {
      return { source: 'keystore-auth', requestId, ok: false, error: 'sign_failed' };
    }
  }

  if (type === 'verifySignature') {
    try {
      const didKey = request.didKey;
      if (!didKey) {
        return { source: 'keystore-auth', requestId, ok: false, error: 'missing_didKey' };
      }

      const messageHex = request.message;
      const signatureHex = request.signature;

      if (!messageHex || !signatureHex) {
        return { source: 'keystore-auth', requestId, ok: false, error: 'missing_payload' };
      }

      const msgBytes = hexToBytes(messageHex);
      const sigBytes = hexToBytes(signatureHex);
      const verified = await verifySignature(msgBytes, sigBytes, didKey);

      return { source: 'keystore-auth', requestId, ok: true, verified };
    } catch {
      return { source: 'keystore-auth', requestId, ok: false, error: 'verify_failed' };
    }
  }

  return { source: 'keystore-auth', requestId, ok: false, error: 'unknown_request_type' };
}
