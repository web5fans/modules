import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface UserData {
  didKey: string;
  did: string;
  metadata: string;
  username: string;
  pds: string;
  ckbAddress: string;
  accessJwt?: string;
  refreshJwt?: string;
}

interface UserContextType {
  user: UserData | null;
  isLoggedIn: boolean;
  login: (data: UserData) => void;
  logout: () => void;
  updateUser: (updates: Partial<UserData>) => void;
}

const USER_STORAGE_KEY = 'daoworld_user';

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(USER_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const isLoggedIn = !!user;

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const login = (data: UserData) => {
    setUser(data);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const updateUser = (updates: Partial<UserData>) => {
    setUser(prev => prev ? { ...prev, ...updates } : null);
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
