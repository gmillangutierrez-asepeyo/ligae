
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useToken } from './token-context';
import { fetchExporterEmails } from '@/lib/api';
import { getMyManagers, getManagedUsers } from '@/app/actions/hierarchy';

interface Manager {
  displayName: string;
  email: string;
  photoUrl?: string;
}

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
  const { token, fetchToken, isTokenLoading } = useToken();
  const { toast } = useToast();

  const updateUserRoles = useCallback(async (currentUser: User | null) => {
    if (currentUser?.email) {
      const userEmail = currentUser.email;
      setRolesLoading(true);
      
      try {
        // Fetch all roles concurrently
        const [managedUsersResult, myManagersResult, fetchedExporters] = await Promise.all([
          getManagedUsers(userEmail),
          getMyManagers(userEmail),
          fetchExporterEmails(token!)
        ]);

        // Handle managed users
        if (managedUsersResult.error) {
           // It's a common case that a user is not a manager, so we don't show an error toast.
           console.log(`Could not get managed users for ${userEmail}: ${managedUsersResult.error}`);
           setIsManager(false);
           setManagedUsers([]);
        } else {
           const users = managedUsersResult.users?.map(u => u.email) ?? [];
           setManagedUsers(users);
           setIsManager(users.length > 0);
        }

        // Handle user's managers
        if (myManagersResult.error) {
           console.error(`Could not get managers for ${userEmail}: ${myManagersResult.error}`);
           setMyManagers([]);
        } else {
          setMyManagers(myManagersResult.managers?.map(m => m.email) ?? []);
        }

        // Handle exporter role
        setExporterEmails(fetchedExporters);
        setIsExporter(fetchedExporters.includes(userEmail));
        
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error de Configuración',
          description: 'No se pudo cargar la configuración de roles y jerarquía desde Google Workspace.',
        });
        setIsManager(false);
        setManagedUsers([]);
        setMyManagers([]);
        setIsExporter(false);
      } finally {
        setRolesLoading(false);
      }

    } else {
      // No user, reset all roles
      setIsManager(false);
      setIsExporter(false);
      setManagedUsers([]);
      setMyManagers([]);
      setRolesLoading(false);
    }
  }, [toast, token]);

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
    if (token && user) {
        updateUserRoles(user);
    } else if (!user) {
      // If there's no user, we are not loading roles.
      updateUserRoles(null);
    }
  }, [user, token, updateUserRoles]);

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
