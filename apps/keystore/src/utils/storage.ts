// Based on https://github.com/web5fans/web5fans.github.io/blob/ccc-sdk/src/utils/storage.ts

export const STORAGE_KEY_STATE = 'web5_keystore_state';
export const STORAGE_KEY_WHITELIST = 'web5_keystore_origin_whitelist';

export const DEFAULT_WHITELIST = [
  'http://localhost:3000', // Console App dev
  'http://localhost:3004', // Daoworld App dev
  'http://localhost:3001', // Keystore App itself dev
  'https://console.web5.fans', // Console App
  'https://me.web5.fans', // Daoworld App
  'https://keystore.web5.fans', // Keystore App
  'https://www.bbsfans.dev', // bbsfans.dev
  'https://www.ccfdao.dev', // ccfdao.dev
];

export interface SigningKeyData {
  privateKey: string;
  didKey: string;
  createdAt: number;
}

export interface KeyEntry extends SigningKeyData {
  id: string; // uuid or did
  alias: string;
}

export interface KeyStoreState {
  keys: KeyEntry[];
  activeKeyId: string | null;
}

// Internal helper
const getState = (): KeyStoreState => {
  const data = localStorage.getItem(STORAGE_KEY_STATE);
  if (!data) return { keys: [], activeKeyId: null };
  try {
    return JSON.parse(data);
  } catch {
    return { keys: [], activeKeyId: null };
  }
};

const saveState = (state: KeyStoreState) => {
  localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
};

// API
export const getAllKeys = (): KeyEntry[] => {
  return getState().keys;
};

export const getActiveKey = (): KeyEntry | null => {
  const state = getState();
  if (!state.activeKeyId) return null;
  return state.keys.find(k => k.id === state.activeKeyId) || null;
};

export const addKey = (keyData: SigningKeyData, alias: string): KeyEntry => {
  const state = getState();
  const newKey: KeyEntry = {
    ...keyData,
    id: crypto.randomUUID(),
    alias: alias || `Key ${state.keys.length + 1}`
  };
  
  state.keys.push(newKey);
  
  // Auto-activate if it's the first key
  if (state.keys.length === 1) {
    state.activeKeyId = newKey.id;
  }
  
  saveState(state);
  return newKey;
};

export const deleteKey = (id: string): void => {
  const state = getState();
  state.keys = state.keys.filter(k => k.id !== id);
  
  // If we deleted the active key, unset activeKeyId or switch to another?
  // Let's unset it to be safe, user must manually select another.
  if (state.activeKeyId === id) {
    state.activeKeyId = null;
    // Optional: auto-select next available
    if (state.keys.length > 0) {
      state.activeKeyId = state.keys[0].id;
    }
  }
  
  saveState(state);
};

export const setActiveKey = (id: string): void => {
  const state = getState();
  if (state.keys.some(k => k.id === id)) {
    state.activeKeyId = id;
    saveState(state);
  }
};

// Whitelist Management (unchanged)
export const getStoredWhitelist = (): string[] => {
  const data = localStorage.getItem(STORAGE_KEY_WHITELIST);
  return data ? JSON.parse(data) : [];
};

export const saveStoredWhitelist = (list: string[]): void => {
  localStorage.setItem(STORAGE_KEY_WHITELIST, JSON.stringify(list));
};

export const isOriginAllowed = (origin: string): boolean => {
  if (DEFAULT_WHITELIST.includes(origin)) return true;
  const stored = getStoredWhitelist();
  return stored.includes(origin);
};

export const addOriginToWhitelist = (origin: string): void => {
  const stored = getStoredWhitelist();
  if (!stored.includes(origin) && !DEFAULT_WHITELIST.includes(origin)) {
    stored.push(origin);
    saveStoredWhitelist(stored);
  }
};

export const removeOriginFromWhitelist = (origin: string): void => {
  // Cannot remove default whitelist items via this method, logic handled in UI or here?
  // User can only remove what they added.
  const stored = getStoredWhitelist();
  const newList = stored.filter(o => o !== origin);
  saveStoredWhitelist(newList);
};

