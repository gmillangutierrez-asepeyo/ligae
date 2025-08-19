
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useToken } from './token-context';
import { fetchHierarchy, fetchExporterEmails, type ManagerHierarchy } from '@/lib/api';


interface AuthContextType {
  user: User | null;
  loading: boolean;
  isManager: boolean;
  managedUsers: string[];
  isExporter: boolean;
  myManagers: string[];
  signIn: () => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hierarchy, setHierarchy] = useState<ManagerHierarchy>({});
  const [exporterEmails, setExporterEmails] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [isExporter, setIsExporter] = useState(false);
  const [managedUsers, setManagedUsers] = useState<string[]>([]);
  const [myManagers, setMyManagers] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const { token, fetchToken, isTokenLoading } = useToken();
  const { toast } = useToast();

  const updateUserRoles = useCallback((currentUser: User | null, currentHierarchy: ManagerHierarchy, currentExporterEmails: string[]) => {
    if (currentUser?.email) {
      const userEmail = currentUser.email;
      
      // Manager role
      const userIsManager = userEmail in currentHierarchy;
      setIsManager(userIsManager);
      setManagedUsers(userIsManager ? currentHierarchy[userEmail] : []);

      // Exporter role
      const userIsExporter = currentExporterEmails.includes(userEmail);
      setIsExporter(userIsExporter);

      // Find user's managers
      const managers: string[] = [];
      for (const managerEmail in currentHierarchy) {
        if (currentHierarchy[managerEmail].includes(userEmail)) {
          managers.push(managerEmail);
        }
      }
      setMyManagers(managers);

    } else {
      setIsManager(false);
      setIsExporter(false);
      setManagedUsers([]);
      setMyManagers([]);
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


  // Effect to load roles when token is available
  useEffect(() => {
    async function loadRoles() {
      if (token && user) {
        setRolesLoading(true);
        try {
          const [fetchedHierarchy, fetchedExporters] = await Promise.all([
             fetchHierarchy(token),
             fetchExporterEmails(token)
          ]);
          setHierarchy(fetchedHierarchy);
          setExporterEmails(fetchedExporters);
          updateUserRoles(user, fetchedHierarchy, fetchedExporters);
        } catch (error: any) {
          console.error("Error al cargar los roles:", error);
          toast({
            variant: 'destructive',
            title: 'Error de Configuración',
            description: 'No se pudo cargar la configuración de roles desde Firestore.',
          });
          setHierarchy({});
          setExporterEmails([]);
          updateUserRoles(user, {}, []);
        } finally {
          setRolesLoading(false);
        }
      } else if (!user) {
        // If there's no user, we are not loading roles.
        setRolesLoading(false);
        updateUserRoles(null, {}, []);
      }
    }
    
    // Only load roles when token is available and auth check is complete.
    if (!isTokenLoading && !authLoading) {
        loadRoles();
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
        setRolesLoading(true); // Reset for next login
    }
  };

  const value = {
    user,
    // The overall loading state now includes role loading.
    loading: authLoading || isTokenLoading || rolesLoading,
    isManager,
    managedUsers,
    isExporter,
    myManagers,
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
