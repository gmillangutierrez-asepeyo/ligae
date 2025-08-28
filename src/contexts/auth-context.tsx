
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
  const [isManager, setIsManager] = useState(false);
  const [isExporter, setIsExporter] = useState(false);
  const [managedUsers, setManagedUsers] = useState<string[]>([]);
  const [myManagers, setMyManagers] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);

  const { token, fetchToken } = useToken();
  const { toast } = useToast();
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);

      // Handle user being logged out or accessing with wrong domain
      if (!currentUser || !currentUser.email || !currentUser.email.endsWith(process.env.NEXT_PUBLIC_ALLOWED_DOMAIN!)) {
        if (currentUser) { // If logged in but wrong domain
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: `Solo se permiten cuentas de @${process.env.NEXT_PUBLIC_ALLOWED_DOMAIN!}.`,
          });
        }
        setUser(null);
        setIsManager(false);
        setIsExporter(false);
        setManagedUsers([]);
        setMyManagers([]);
        setLoading(false);
        return;
      }
      
      // User is authenticated correctly
      setUser(currentUser);
      
      // Now, fetch all roles and hierarchy data before finishing loading
      try {
        const userEmail = currentUser.email;
        const apiToken = token || await fetchToken();

        if (!apiToken) {
          throw new Error("No se pudo obtener el token de la API para cargar los roles.");
        }

        const [myManagersResult, managedUsersResult, fetchedExporters] = await Promise.all([
          getMyManagers(userEmail),
          getManagedUsers(userEmail),
          fetchExporterEmails(apiToken)
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
            setIsManager(managedUserEmails.length > 0);
            setManagedUsers(managedUserEmails);
        }

        // Handle exporter role
        setIsExporter(fetchedExporters.includes(userEmail));
        
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error al Cargar Roles',
          description: error.message || 'No se pudo cargar la configuración de roles y jerarquía.',
        });
        // Reset roles on error
        setIsManager(false);
        setIsExporter(false);
        setManagedUsers([]);
        setMyManagers([]);
      } finally {
        // All auth and role fetching is complete
        setLoading(false);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const signIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // The onAuthStateChanged listener will handle the post-login logic
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
    await signOut(auth);
    // The onAuthStateChanged listener will handle the post-signout logic
  };

  const value = {
    user,
    loading,
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
