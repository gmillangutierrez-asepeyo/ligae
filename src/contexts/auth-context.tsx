'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAndStoreToken = async (currentUser: User) => {
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to fetch OAuth token.');
      }

      const { accessToken } = await response.json();
      if (accessToken) {
        localStorage.setItem('oauth_token', accessToken);
      } else {
        throw new Error('Received an empty access token.');
      }
    } catch (error: any) {
      console.error("Token generation failed:", error.message);
      localStorage.removeItem('oauth_token');
      toast({
        variant: 'destructive',
        title: 'Fallo al generar el Token',
        description: 'No se pudo obtener el token de acceso. Por favor, configúralo manualmente en Ajustes.',
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser && currentUser.email && !currentUser.email.endsWith('@asepeyo.es')) {
        signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: 'Solo se permiten cuentas de @asepeyo.es.',
        });
        setUser(null);
        localStorage.removeItem('oauth_token');
      } else {
        setUser(currentUser);
        if (currentUser) {
          fetchAndStoreToken(currentUser);
        } else {
          localStorage.removeItem('oauth_token');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const signIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting the user and fetching the token
    } catch (error) {
      console.error("Sign in error", error);
      toast({
        variant: "destructive",
        title: "Sign-in Failed",
        description: "Could not sign in with Google. Please try again.",
      });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setLoading(false);
  };

  const value = {
    user,
    loading,
    signIn,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
