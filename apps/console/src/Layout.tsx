import { Outlet, Link, useLocation } from 'react-router-dom';
import w5Logo from './assets/w5-logo.svg';
import { useKeystore } from './contexts/KeystoreContext';
import { usePds } from './contexts/PdsContext';
import { Wifi, WifiOff, Key, Wallet, LogOut, Loader, Server } from 'lucide-react';
import { ccc } from '@ckb-ccc/connector-react';
import { useState, useEffect } from 'react';
import { KEY_STORE_URL } from 'keystore/constants';

export function Layout() {
  const location = useLocation();
  const { connected, didKey } = useKeystore();
  const { pdsUrl, setPdsUrl, availablePds, username, setUsername, resolvedDid, isResolving, isAvailable } = usePds();
  const { wallet, open, disconnect } = ccc.useCcc();
  const signer = ccc.useSigner();

  const [address, setAddress] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [loadingInfo, setLoadingInfo] = useState(false);

  useEffect(() => {
    if (!signer) {
      setAddress('');
      setBalance('');
      return;
    }

    const fetchInfo = async () => {
      setLoadingInfo(true);
      try {
        const addr = await signer.getRecommendedAddress();
        setAddress(addr);

        const bal = await signer.getBalance();
        const ckb = (Number(bal) / 100_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setBalance(ckb);
      } catch (e) {
        console.error('Failed to fetch signer info:', e);
      } finally {
        setLoadingInfo(false);
      }
    };

    fetchInfo();
  }, [signer]);

  const formatAddress = (addr: string) => {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const navItems = [
    { path: '/keys', label: 'Keys' },
    { path: '/dids', label: 'DIDs' },
    { path: '/pds', label: 'PDS' },
    { path: '/browser', label: 'Browser' },
    { path: '/relayer', label: 'Relayer' },
  ];

  return (
    <div className="container">
      {/* Header */}
      <header className="header-bar">
        <div className="header-logos">
          <a href="https://web5.fans" target="_blank" rel="noopener noreferrer">
            <img src={w5Logo} className="top-logo" alt="Web5 fans logo" />
          </a>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-heading)' }}>
              Web5 Console
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-subtle)' }}>
              Decentralized Identity Management
            </p>
          </div>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          {/* CKB Wallet */}
          {wallet ? (
            <div className="status-row">
              <div className="badge" title={address}>
                <Wallet size={14} />
                <span className="font-mono">{loadingInfo ? <Loader size={12} className="spin" /> : formatAddress(address)}</span>
                {balance && <span style={{ marginLeft: '0.5rem', fontWeight: 500 }}>{balance} CKB</span>}
              </div>
              <button
                onClick={open}
                className="btn btn-sm btn-ghost"
                title="Wallet Settings"
              >
                <Key size={14} />
              </button>
              <button
                onClick={disconnect}
                className="btn btn-sm btn-ghost"
                title="Disconnect"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={open}
            >
              <Wallet size={16} /> Connect Wallet
            </button>
          )}

          {/* Keystore & DID */}
          <div className="status-row">
            {didKey && (
              <div className="badge badge-primary" title={didKey}>
                <Key size={14} />
                <span className="font-mono">{didKey.slice(0, 10)}...{didKey.slice(-4)}</span>
              </div>
            )}
            <a
              href={KEY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`badge ${connected ? 'badge-success' : 'badge-error'} cursor-pointer`}
              style={{ textDecoration: 'none' }}
            >
              {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{connected ? 'Connected' : 'Offline'}</span>
            </a>
          </div>

          {/* PDS Selector */}
          <div className="status-row">
            <div className="badge gap-0 p-0 overflow-hidden" style={{ border: 'none', background: 'transparent' }}>
              <div className="px-2 py-1 bg-slate-100 border" style={{ borderRadius: 'var(--radius) 0 0 var(--radius)', borderRight: 'none' }}>
                <span className="text-xs font-medium text-muted">@</span>
              </div>
              <input
                className="input"
                style={{ borderRadius: '0 var(--radius) var(--radius) 0', minWidth: '100px', padding: '0.375rem 0.75rem' }}
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="badge">
              <Server size={14} />
              <select
                value={pdsUrl}
                onChange={(e) => setPdsUrl(e.target.value)}
                className="border-none bg-transparent text-inherit font-medium cursor-pointer outline-none"
                style={{ fontSize: '0.75rem' }}
              >
                {availablePds.map(url => (
                  <option key={url} value={url}>{url}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Resolved DID */}
          {username && (
            <div className="text-xs" style={{ textAlign: 'right' }}>
              {isResolving ? (
                <span className="text-muted flex items-center justify-end gap-1">
                  <Loader size={10} className="spin" /> Resolving...
                </span>
              ) : !isAvailable ? (
                <span className="text-danger">Not available</span>
              ) : resolvedDid ? (
                <span className="text-success font-mono" title={resolvedDid}>
                  DID: {resolvedDid.slice(0, 12)}...{resolvedDid.slice(-6)}
                </span>
              ) : (
                <span className="text-muted">Available</span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav-bar">
        {navItems.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Content */}
      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}
