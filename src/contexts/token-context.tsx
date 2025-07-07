'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from './auth-context';

interface TokenContextType {
  token: string | null;
  setToken: (token: string | null) => void;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'google-oauth-token';

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (storedToken) {
        setTokenState(storedToken);
      }
    } catch (error) {
      console.error("Could not access localStorage", error);
    }
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    try {
        if (newToken) {
            localStorage.setItem(TOKEN_STORAGE_KEY, newToken);
        } else {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    } catch (error) {
        console.error("Could not access localStorage", error);
    }
  };
  
  // When user signs out, clear the token.
  useEffect(() => {
      if (!user) {
          setToken(null);
      }
  }, [user]);

  return (
    <TokenContext.Provider value={{ token, setToken }}>
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error('useToken must be used within a TokenProvider');
  }
  return context;
}
