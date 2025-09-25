'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { getAccessToken } from '@/app/actions/getToken';
import { useToast } from '@/hooks/use-toast';

interface TokenContextType {
  token: string | null;
  isTokenLoading: boolean;
  fetchToken: (scopes?: string[]) => Promise<string | null>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const { toast } = useToast();

  const fetchToken = useCallback(async (scopes?: string[]): Promise<string | null> => {
    // This allows a component to request a token and use it immediately,
    // even if it's already being fetched elsewhere.
    if (isTokenLoading) {
      // Wait for the ongoing fetch to complete
      await new Promise(resolve => {
        const interval = setInterval(() => {
          if (!isTokenLoading) {
            clearInterval(interval);
            resolve(null);
          }
        }, 100);
      });
      // After waiting, the token should be in the state
      return token;
    }
    
    setIsTokenLoading(true);
    try {
      const result = await getAccessToken(scopes);
      if (result.error) {
        throw new Error(result.error);
      }
      setTokenState(result.token!);
      return result.token!;
    } catch (error: any) {
      console.error("Error al obtener el token de acceso:", error);
      setTokenState(null);
      toast({
        variant: 'destructive',
        title: 'Fallo de Autenticación',
        description: 'No se pudo obtener un token de acceso del servidor. ' + error.message,
      });
      return null;
    } finally {
      setIsTokenLoading(false);
    }
  }, [toast, isTokenLoading, token]);


  return (
    <TokenContext.Provider value={{ token, isTokenLoading, fetchToken }}>
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
