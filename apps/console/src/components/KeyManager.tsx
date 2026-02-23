import { useState } from 'react';
import { useKeystore } from '../contexts/KeystoreContext';
import { Check, AlertCircle, Shield, PenTool, CheckCircle } from 'lucide-react';
import { bytesFrom, hexFrom } from '@ckb-ccc/ccc';

export function KeyManager() {
  const { client, connected } = useKeystore();

  const [pingStatus, setPingStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pingResult, setPingResult] = useState('');

  const [didStatus, setDidStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [didResult, setDidResult] = useState('');

  const [signStatus, setSignStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [signMsg, setSignMsg] = useState('Hello Web5');
  const [signResult, setSignResult] = useState('');

  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyDid, setVerifyDid] = useState('');
  const [verifyMsg, setVerifyMsg] = useState('Hello Web5');
  const [verifySig, setVerifySig] = useState('');
  const [verifyResult, setVerifyResult] = useState('');

  const handlePing = async () => {
    if (!client) return;
    setPingStatus('loading');
    try {
      const duration = await client.ping();
      setPingResult(`PONG in ${duration.toFixed(2)}ms`);
      setPingStatus('success');
    } catch (e: unknown) {
      setPingResult(e instanceof Error ? e.message : String(e));
      setPingStatus('error');
    }
  };

  const handleGetDID = async () => {
    if (!client) return;
    setDidStatus('loading');
    try {
      const did = await client.getDIDKey();
      if (did) {
        setDidResult(did);
        setVerifyDid(did);
        setDidStatus('success');
      } else {
        setDidResult('No DID returned (Key not created?)');
        setDidStatus('error');
      }
    } catch (e: unknown) {
      setDidResult(e instanceof Error ? e.message : String(e));
      setDidStatus('error');
    }
  };

  const handleSign = async () => {
    if (!client) return;
    setSignStatus('loading');
    try {
      const sig = await client.signMessage(bytesFrom(signMsg, 'utf8'));
      setSignResult(hexFrom(sig));
      setVerifySig(hexFrom(sig));
      setSignStatus('success');
    } catch (e: unknown) {
      setSignResult(e instanceof Error ? e.message : String(e));
      setSignStatus('error');
    }
  };

  const handleVerify = async () => {
    if (!client) return;
    setVerifyStatus('loading');
    try {
      const isValid = await client.verifySignature(verifyDid, bytesFrom(verifyMsg, 'utf8'), bytesFrom(verifySig));
      setVerifyResult(isValid ? 'Signature Valid' : 'Signature Invalid');
      setVerifyStatus(isValid ? 'success' : 'error');
    } catch (e: unknown) {
      setVerifyResult(e instanceof Error ? e.message : String(e));
      setVerifyStatus('error');
    }
  };

  const renderStatus = (status: string, result: string) => {
    if (status === 'idle') return null;
    if (status === 'loading') return <div className="text-sm text-muted">Processing...</div>;

    const isSuccess = status === 'success';
    return (
      <div
        className={`p-sm rounded flex items-center gap-sm break-all ${isSuccess ? 'badge-success' : 'badge-error'}`}
        style={{ display: 'flex' }}
      >
        {isSuccess ? <Check size={16} /> : <AlertCircle size={16} />}
        <span className="font-mono text-xs">{result}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-md mb-xl">
        <div
          className="p-md rounded-lg"
          style={{ background: 'var(--primary-light)' }}
        >
          <Shield size={28} color="var(--primary-color)" />
        </div>
        <div>
          <h2 className="m-0 text-xl" style={{ color: 'var(--text-heading)' }}>Key Manager</h2>
          <p className="m-0 text-muted">Test connection and signing capabilities</p>
        </div>
      </div>

      {/* Basic Actions */}
      <div className="card">
        <h3 className="flex items-center gap-sm mb-lg">Basic Actions</h3>
        <div className="flex-col gap-md">
          <div className="flex items-center gap-md flex-wrap">
            <button
              className="btn btn-secondary"
              onClick={handlePing}
              disabled={!connected || pingStatus === 'loading'}
            >
              Ping Bridge
            </button>
            {renderStatus(pingStatus, pingResult)}
          </div>

          <div className="flex items-center gap-md flex-wrap">
            <button
              className="btn btn-secondary"
              onClick={handleGetDID}
              disabled={!connected || didStatus === 'loading'}
            >
              Get DID Key
            </button>
            {renderStatus(didStatus, didResult)}
          </div>
        </div>
      </div>

      {/* Sign Message */}
      <div className="card">
        <h3 className="flex items-center gap-sm mb-lg">
          <PenTool size={18} /> Sign Message
        </h3>
        <div className="flex gap-sm mb-md">
          <input
            className="input flex-1"
            value={signMsg}
            onChange={(e) => setSignMsg(e.target.value)}
            placeholder="Message to sign"
          />
          <button
            className="btn btn-primary"
            onClick={handleSign}
            disabled={!connected || signStatus === 'loading'}
          >
            {signStatus === 'loading' ? 'Signing...' : 'Sign'}
          </button>
        </div>
        {renderStatus(signStatus, signResult)}
      </div>

      {/* Verify Signature */}
      <div className="card">
        <h3 className="flex items-center gap-sm mb-lg">
          <CheckCircle size={18} /> Verify Signature
        </h3>
        <div className="flex-col gap-sm mb-md">
          <input
            className="input"
            value={verifyDid}
            onChange={(e) => setVerifyDid(e.target.value)}
            placeholder="DID Key"
          />
          <input
            className="input"
            value={verifyMsg}
            onChange={(e) => setVerifyMsg(e.target.value)}
            placeholder="Message"
          />
          <input
            className="input"
            value={verifySig}
            onChange={(e) => setVerifySig(e.target.value)}
            placeholder="Signature Hex"
          />
          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              onClick={handleVerify}
              disabled={!connected || verifyStatus === 'loading'}
            >
              {verifyStatus === 'loading' ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
        {renderStatus(verifyStatus, verifyResult)}
      </div>
    </div>
  );
}
