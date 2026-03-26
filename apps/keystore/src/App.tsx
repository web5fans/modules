import { Wallet, ShieldCheck, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';
import { KeyStore } from './components/KeyStore';
import { Signer } from './components/Signer';
import { WhitelistSettings } from './components/WhitelistSettings';
import { useClientConnection } from './hooks/useClientConnection';

function App() {
  const { hasOpener } = useClientConnection();
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="min-h-screen">
      {hasOpener && !dismissed && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#fff3cd',
            borderBottom: '2px solid #ffc107',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={20} color="#856404" />
            <div style={{ fontWeight: 600, color: '#333', fontSize: '14px' }}>
              Do not close this page while the app is running
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#666',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <header className="header" style={{ marginTop: hasOpener && !dismissed ? '52px' : 0 }}>
        <div className="header-content">
            <div className="logo">
                <div className="logo-icon-wrapper">
                    <Wallet size={24} />
                </div>
                <span>Web5 Keystore</span>
            </div>
            <div className="badge">
                <ShieldCheck size={16} color="var(--success-color)" />
                <span>Secure Sandbox Environment</span>
            </div>
        </div>
      </header>

      <main className="container">
        <KeyStore />
        <Signer />
        <WhitelistSettings />
      </main>
    </div>
  );
}

export default App;
