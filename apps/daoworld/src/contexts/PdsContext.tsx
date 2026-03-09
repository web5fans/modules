import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AtpAgent as AtpAgentType } from 'web5-api';
import { AVAILABLE_PDS } from 'pds_module/constants';
import { checkUsernameFormat, getDidByUsername } from 'pds_module/logic';

interface PdsContextType {
  agent: AtpAgentType | null;
  pdsUrl: string;
  setPdsUrl: (url: string) => void;
  availablePds: string[];
  username: string;
  setUsername: (username: string) => void;
  resolvedDid: string | null;
  isResolving: boolean;
  isAvailable: boolean | null;
  checkAvailability: (name: string, pds: string) => Promise<boolean>;
}

const PdsContext = createContext<PdsContextType | null>(null);

export function PdsProvider({ children }: { children: ReactNode }) {
  const [pdsUrl, setPdsUrl] = useState<string>(() => {
    return localStorage.getItem('daoworld_pds_url') || AVAILABLE_PDS[0];
  });

  const [username, setUsernameState] = useState<string>('');
  const [resolvedDid, setResolvedDid] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [agent, setAgent] = useState<AtpAgentType | null>(null);

  const setUsername = useCallback((name: string) => {
    setUsernameState(name);
    if (!name) {
      setResolvedDid(null);
      setIsAvailable(null);
    }
  }, []);

  const checkAvailability = useCallback(async (name: string, pds: string): Promise<boolean> => {
    if (!checkUsernameFormat(name)) {
      setIsAvailable(false);
      return false;
    }
    
    setIsResolving(true);
    try {
      const did = await getDidByUsername(name, pds);
      const available = !did;
      setIsAvailable(available);
      setResolvedDid(did || null);
      return available;
    } catch {
      setIsAvailable(false);
      setResolvedDid(null);
      return false;
    } finally {
      setIsResolving(false);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('daoworld_pds_url', pdsUrl);
  }, [pdsUrl]);

  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      try {
        const serviceUrl = pdsUrl.startsWith('http') ? pdsUrl : `https://${pdsUrl}`;
        const mod = await import('web5-api');
        const Ctor =
          typeof (mod as any).AtpAgent === 'function'
            ? (mod as any).AtpAgent
            : typeof (mod as any).default === 'function'
              ? (mod as any).default
              : null;
        if (!Ctor) {
          throw new TypeError('web5-api exports do not include AtpAgent constructor');
        }
        const newAgent = new Ctor({ service: serviceUrl }) as AtpAgentType;
        if (!cancelled) {
          setAgent(newAgent);
        }
      } catch (e) {
        console.error('Failed to initialize AtpAgent', e);
        if (!cancelled) {
          setAgent(null);
        }
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [pdsUrl]);

  return (
    <PdsContext.Provider value={{ 
      agent, 
      pdsUrl, 
      setPdsUrl, 
      availablePds: AVAILABLE_PDS,
      username,
      setUsername,
      resolvedDid,
      isResolving,
      isAvailable,
      checkAvailability
    }}>
      {children}
    </PdsContext.Provider>
  );
}

export function usePds() {
  const context = useContext(PdsContext);
  if (!context) {
    throw new Error('usePds must be used within a PdsProvider');
  }
  return context;
}
