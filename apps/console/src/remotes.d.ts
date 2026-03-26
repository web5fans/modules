
/// <reference types="vite/client" />

declare module 'did_module/logic' {
    import { ccc, Transaction } from "@ckb-ccc/ccc";
  
    export const name: string;
    
    export function buildCreateTransaction(
      signer: ccc.Signer,
      metadata: string
    ): Promise<{
      rawTx: string;
      did: string;
    }>;
  
    export function sendCkbTransaction(signer: ccc.Signer, tx: Transaction): Promise<string>;
  
    export interface didCkbCellInfo {
      txHash: string;
      index: number;
      args: string;
      capacity: string;
      did: string;
      didMetadata: string;
    }
  
    export function fetchDidCkbCellsInfo(
      signer: ccc.Signer
    ): Promise<Array<didCkbCellInfo>>;
  
    export function destroyDidCell(
      signer: ccc.Signer,
      args: string
    ): Promise<string>;
  
    export function updateDidKey(
      signer: ccc.Signer,
      args: string,
      newDidKey: string
    ): Promise<string>;

    export async function updateHandle(
      signer: ccc.Signer,
      args: string,
      handle: string
    ): Promise<string>;
  
    export function transferDidCell(
      signer: ccc.Signer,
      args: string,
      receiverAddress: string
    ): Promise<string>;
  }
  
  declare module 'pds_module/logic' {
    import { AtpAgent } from "web5-api";
    import type { KeystoreClient } from "keystore/KeystoreClient";
  
    export const name: string;
  
    export function checkUsernameFormat(username: string): boolean;
  
    export function getDidByUsername(username: string, pdsAPIUrl: string): Promise<string | null>;
  
    export type userInfo = {
      accessJwt: string;
      refreshJwt: string;
      handle: string;
      did: string;
    }
  
    export function pdsCreateAccount(
      agent: AtpAgent, 
      pdsAPIUrl: string, 
      username: string, 
      didKey: string, 
      did: string, 
      ckbAddr: string, 
      keyStoreClient: KeystoreClient
    ): Promise<userInfo | null>;
  
    export function pdsDeleteAccount(
      agent: AtpAgent, 
      did: string, 
      ckbAddr: string, 
      didKey: string, 
      keyStoreClient: KeystoreClient
    ): Promise<boolean | null>;
  
    export type sessionInfo = {
      accessJwt: string;
      refreshJwt: string;
      handle: string;
      did: string;
      didMetadata: string;
    }
  
    export function pdsLogin(
      agent: AtpAgent, 
      did: string, 
      didKey: string, 
      ckbAddr: string, 
      keyStoreClient: KeystoreClient
    ): Promise<sessionInfo | null>;
  
    export type userProfile = {
      uri: string;
      cid: string;
      value: Record<string, any>;
    }

    export function fetchUserProfile(did: string, pdsAPIUrl: string): Promise<userProfile | null>;

    export type RepoInfo = {
      handle: string;
      did: string;
      didDoc: {
        verificationMethods: Record<string, string>;
        alsoKnownAs: string[];
        services: Record<string, {
          type: string;
          endpoint: string;
        }>;
      };
      collections: string[];
      handleIsCorrect: boolean;
    };

    export function fetchRepoInfo(did: string, pdsAPIUrl: string): Promise<RepoInfo | null>;
  
    export type RepoRecords = {
      cursor?: string;
      records: {
        uri: string;
        cid: string;
        value: Record<string, any>;
      }[];
    };

    export function fetchRepoRecords(did: string, collection: string, pdsAPIUrl: string, limit?: number, cursor?: string): Promise<RepoRecords | null>;

    export type RepoBlobs = {
      cursor?: string;
      cids: string[];
    };

    export function fetchRepoBlobs(did: string, pdsAPIUrl: string, limit?: number, cursor?: string): Promise<RepoBlobs | null>;

    export function exportRepoCar(did: string, pdsAPIUrl: string, since?: string): Promise<ArrayBuffer | null>;

    export function importRepoCar(did: string, pdsAPIUrl: string, car: ArrayBuffer, accessToken: string): Promise<boolean | null>;

    export type RecordType = {
      $type: string;
      [key: string]: any;
    };
  
    export function writePDS(
      agent: AtpAgent, 
      accessJwt: string, 
      didKey: string, 
      keyStoreClient: KeystoreClient, 
      params: {
        record: RecordType
        did: string
        rkey: string
        type?: 'update' | 'create' | 'delete'
      }
    ): Promise<boolean | null>;
  }

declare module 'keystore/KeystoreClient' {
    export type BridgeRequest = {
        type: string;
        requestId: string;
        message?: Uint8Array;
        didKey?: string;
        signature?: Uint8Array;
    };

    export type BridgeResponse = {
        type: string;
        requestId: string;
        ok: boolean;
        error?: string;
        didKey?: string;
        verified?: boolean;
        signature?: Uint8Array;
    }

    export class KeystoreClient {
        constructor(keystoreUrl?: string);
        connect(): Promise<void>;
        disconnect(): void;
        ping(): Promise<number>;
        getDIDKey(): Promise<string>;
        signMessage(message: Uint8Array): Promise<Uint8Array>;
        verifySignature(didKey: string, message: Uint8Array, signature: Uint8Array): Promise<boolean>;
    }
}

declare module 'keystore/constants' {
    export const KEY_STORE_URL: string;
}

declare module 'pds_module/constants' {
    export const AVAILABLE_PDS: string[];
}
