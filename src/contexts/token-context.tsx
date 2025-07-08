'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { useAuth } from './auth-context';
import { getAccessToken } from '@/app/actions/getToken';
import { useToast } from '@/hooks/use-toast';

interface TokenContextType {
  token: string | null;
  isTokenLoading: boolean;
  fetchToken: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchToken = useCallback(async () => {
    // Avoid fetching if already in progress or no user
    if (isTokenLoading || !user) return; 
    
    setIsTokenLoading(true);
    try {
      const result = await getAccessToken();
      if (result.error) {
        throw new Error(result.error);
      }
      setTokenState(result.token!);
    } catch (error: any) {
      console.error("Error al obtener el token de acceso:", error);
      setTokenState(null);
      toast({
        variant: 'destructive',
        title: 'Fallo de Autenticación',
        description: 'No se pudo obtener un token de acceso del servidor. ' + error.message,
      });
    } finally {
      setIsTokenLoading(false);
    }
  }, [user, toast, isTokenLoading]);

  // When user logs in, fetch a token
  useEffect(() => {
    if (user && !token) {
      fetchToken();
    }
    // When user logs out, clear the token
    if (!user) {
      setTokenState(null);
    }
  }, [user, token, fetchToken]);


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
