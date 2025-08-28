
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useToken } from './token-context';
import { fetchExporterEmails } from '@/lib/api';
import { getMyManagers, getManagedUsers } from '@/app/actions/hierarchy';

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
  const [exporterEmails, setExporterEmails] = useState<string[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [isExporter, setIsExporter] = useState(false);
  const [managedUsers, setManagedUsers] = useState<string[]>([]);
  const [myManagers, setMyManagers] = useState<string[]>([]);
  
  const [authLoading, setAuthLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);

  const { token, fetchToken } = useToken();
  const { toast } = useToast();

  const updateUserRoles = useCallback(async (currentUser: User | null) => {
    if (currentUser?.email) {
      const userEmail = currentUser.email;
      
      const [myManagersResult, managedUsersResult, fetchedExporters] = await Promise.all([
        getMyManagers(userEmail),
        getManagedUsers(userEmail),
        fetchExporterEmails(token!)
      ]);
      
      // Handle user's managers
      if (myManagersResult.error) {
         console.error(`Could not get managers for ${userEmail}: ${myManagersResult.error}`);
         setMyManagers([]);
      } else {
        setMyManagers(myManagersResult.managers?.map(m => m.email) ?? []);
      }

      // Handle users managed by current user
      if (managedUsersResult.error) {
          console.error(`Could not get managed users for ${userEmail}: ${managedUsersResult.error}`);
          setIsManager(false);
          setManagedUsers([]);
      } else {
          const managedUserEmails = managedUsersResult.users?.map(u => u.email) ?? [];
          if (managedUserEmails.length > 0) {
            setIsManager(true);
            setManagedUsers(managedUserEmails);
          } else {
            setIsManager(false);
            setManagedUsers([]);
          }
      }

      // Handle exporter role
      setExporterEmails(fetchedExporters);
      setIsExporter(fetchedExporters.includes(userEmail));
    }
  }, [token]);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setAuthLoading(true);
      if (currentUser && currentUser.email && !currentUser.email.endsWith(process.env.NEXT_PUBLIC_ALLOWED_DOMAIN!)) {
        signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Acceso Denegado',
          description: `Solo se permiten cuentas de @${process.env.NEXT_PUBLIC_ALLOWED_DOMAIN!}.`,
        });
        setUser(null);
        setAuthLoading(false);
        setRolesLoading(false);
      } else {
        setUser(currentUser);
        // Auth check is complete here, now we can check for roles.
        setAuthLoading(false); 
      }
    });

    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    const loadData = async () => {
      if (!authLoading && user && !token) {
        await fetchToken();
      }
      if (!authLoading && user && token) {
        setRolesLoading(true);
        try {
          await updateUserRoles(user);
        } catch (error: any) {
           toast({
            variant: 'destructive',
            title: 'Error de Configuración',
            description: 'No se pudo cargar la configuración de roles y jerarquía.',
          });
        } finally {
          setRolesLoading(false);
        }
      }
      if (!user) {
        setRolesLoading(false);
      }
    }
    loadData();
  }, [user, token, authLoading, fetchToken, toast, updateUserRoles]);

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
    await signOut(auth);
  };

  const value = {
    user,
    loading: authLoading || rolesLoading,
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
