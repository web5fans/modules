
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { KeystoreClient } from 'keystore/KeystoreClient';
import { KEY_STORE_URL } from 'keystore/constants';

interface KeystoreContextType {
  client: KeystoreClient | null;
  connected: boolean;
  didKey: string | null;
}

const KeystoreContext = createContext<KeystoreContextType | null>(null);

export function KeystoreProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<KeystoreClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [didKey, setDidKey] = useState<string | null>(null);

  useEffect(() => {
    // Initialize client only once
    const c = new KeystoreClient(KEY_STORE_URL);
    setClient(c);
    console.log('Global Client initialized, connecting...');

    let isMounted = true;

    c.connect()
      .then(async () => {
        if (isMounted) {
          setConnected(true);
          console.log('Connected to Keystore Bridge (Global)');
          
          // Auto-fetch DID on connect
          try {
            const didKey = await c.getDIDKey();
            if (isMounted && didKey) {
              setDidKey(didKey);
              console.log(`DID Loaded: ${didKey}`);
            }
          } catch (err) {
            console.log(`Failed to fetch DID on connect: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.log(`Global Connection failed: ${err.message}`);
        }
      });

    return () => {
      isMounted = false;
      c.disconnect();
      setConnected(false);
      setDidKey(null);
      console.log('Global Client disconnected');
    };
  }, []);

  return (
    <KeystoreContext.Provider value={{ client, connected, didKey}}>
      {children}
    </KeystoreContext.Provider>
  );
}

export function useKeystore() {
  const context = useContext(KeystoreContext);
  if (!context) {
    throw new Error('useKeystore must be used within a KeystoreProvider');
  }
  return context;
}
