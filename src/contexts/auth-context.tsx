'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useToken } from './token-context';
import { fetchHierarchy, type ManagerHierarchy } from '@/lib/api';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isManager: boolean;
  managedUsers: string[];
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hierarchy, setHierarchy] = useState<ManagerHierarchy>({});
  const [isManager, setIsManager] = useState(false);
  const [managedUsers, setManagedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { token, fetchToken, isTokenLoading } = useToken();
  const { toast } = useToast();

  const updateUserRoles = useCallback((currentUser: User | null, currentHierarchy: ManagerHierarchy) => {
    if (currentUser?.email && currentHierarchy) {
      const userIsManager = currentUser.email in currentHierarchy;
      setIsManager(userIsManager);
      setManagedUsers(userIsManager ? currentHierarchy[currentUser.email] : []);
    } else {
      setIsManager(false);
      setManagedUsers([]);
    }
  }, []);

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
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  // Effect to fetch token when user logs in
  useEffect(() => {
    if(user && !token) {
      fetchToken();
    }
  }, [user, token, fetchToken]);


  // Effect to load hierarchy when token is available
  useEffect(() => {
    async function loadHierarchy() {
      if (token && user) {
        try {
          const fetchedHierarchy = await fetchHierarchy(token);
          setHierarchy(fetchedHierarchy);
          updateUserRoles(user, fetchedHierarchy);
        } catch (error: any) {
          console.error("Error al cargar la jerarquía de managers:", error);
          toast({
            variant: 'destructive',
            title: 'Error de Configuración',
            description: 'No se pudo cargar la jerarquía de managers desde Firestore.',
          });
          // Reset roles if hierarchy fetch fails
          setHierarchy({});
          updateUserRoles(user, {});
        }
      } else {
        // Reset roles if no token or user
        setHierarchy({});
        updateUserRoles(null, {});
      }
    }
    
    // Only load hierarchy when token is available and auth is not loading
    if (!isTokenLoading && !loading) {
        loadHierarchy();
    }
  }, [user, token, isTokenLoading, loading, toast, updateUserRoles]);

  const signIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesión", error);
      toast({
        variant: "destructive",
        title: "Fallo al Iniciar Sesión",
        description: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
      });
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión", error);
      toast({
        variant: 'destructive',
        title: 'Fallo al Cerrar Sesión',
        description: 'No se pudo cerrar la sesión. Inténtalo de nuevo.',
      });
    } finally {
        setLoading(false);
    }
  };

  const value = {
    user,
    loading: loading || isTokenLoading, // The overall loading state depends on both auth and token
    isManager,
    managedUsers,
    signIn,
    signOut: handleSignOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
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
