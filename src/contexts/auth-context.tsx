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
  const [authLoading, setAuthLoading] = useState(true); // Renamed from 'loading' to be specific
  const [hierarchyLoading, setHierarchyLoading] = useState(true);
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
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  // Effect to fetch token when user logs in
  useEffect(() => {
    if(user && !token && !authLoading) {
      fetchToken();
    }
  }, [user, token, fetchToken, authLoading]);


  // Effect to load hierarchy when token is available
  useEffect(() => {
    async function loadHierarchy() {
      if (token && user) {
        setHierarchyLoading(true);
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
          setHierarchy({});
          updateUserRoles(user, {});
        } finally {
          setHierarchyLoading(false);
        }
      } else if (!user) {
        // If there's no user, we are not loading the hierarchy.
        setHierarchyLoading(false);
        updateUserRoles(null, {});
      }
    }
    
    // Only load hierarchy when token is available and auth check is complete.
    if (!isTokenLoading && !authLoading) {
        loadHierarchy();
    }
  }, [user, token, isTokenLoading, authLoading, toast, updateUserRoles]);

  const signIn = async () => {
    setAuthLoading(true);
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
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
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
        setAuthLoading(false);
        setHierarchyLoading(true); // Reset for next login
    }
  };

  const value = {
    user,
    // The overall loading state is now more accurate.
    loading: authLoading || isTokenLoading || hierarchyLoading,
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
