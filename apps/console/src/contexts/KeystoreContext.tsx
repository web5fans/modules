
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { KeystoreClient } from 'keystore/KeystoreClient';
import { KEY_STORE_URL } from 'keystore/constants';

interface KeystoreContextType {
  client: KeystoreClient | null;
  connected: boolean;
  didKey: string | null;
  connect: () => Promise<void>;
  isConnecting: boolean;
}

const KeystoreContext = createContext<KeystoreContextType | null>(null);

export function KeystoreProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<KeystoreClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [didKey, setDidKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Initialize client only once
  useEffect(() => {
    const c = new KeystoreClient(KEY_STORE_URL);
    setClient(c);
    console.log('Global Client initialized');

    return () => {
      c.disconnect();
      setConnected(false);
      setDidKey(null);
      console.log('Global Client disconnected');
    };
  }, []);

  const connect = useCallback(async () => {
    if (!client || isConnecting || connected) return;

    setIsConnecting(true);
    console.log('Connecting to Keystore...');

    try {
      await client.connect();
      setConnected(true);
      console.log('Connected to Keystore Bridge (Global)');

      // Auto-fetch DID on connect
      try {
        const did = await client.getDIDKey();
        if (did) {
          setDidKey(did);
          console.log(`DID Loaded: ${did}`);
        }
      } catch (err) {
        console.log(`Failed to fetch DID on connect: ${err instanceof Error ? err.message : String(err)}`);
      }
    } catch (err) {
      console.error('Failed to connect to Keystore:', err instanceof Error ? err.message : String(err));
    } finally {
      setIsConnecting(false);
    }
  }, [client, isConnecting, connected]);

  return (
    <KeystoreContext.Provider value={{ client, connected, didKey, connect, isConnecting }}>
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
