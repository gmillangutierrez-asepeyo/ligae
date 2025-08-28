
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useToken } from './token-context';
import { fetchExporterEmails } from '@/lib/api';
import { getMyManagers, getManagedUsers } from '@/app/actions/hierarchy';
import { getUserProfile, type UserProfile } from '@/app/actions/getUserProfile';

interface AuthContextType {
  user: User | null;
  workspaceProfile: UserProfile | null;
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
  const [workspaceProfile, setWorkspaceProfile] = useState<UserProfile | null>(null);
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

      if (!currentUser || !currentUser.email || !currentUser.email.endsWith('@asepeyo.es')) {
        if (currentUser) { 
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Acceso Denegado',
            description: `Solo se permiten cuentas de @asepeyo.es.`,
          });
        }
        setUser(null);
        setWorkspaceProfile(null);
        setIsManager(false);
        setIsExporter(false);
        setManagedUsers([]);
        setMyManagers([]);
        setLoading(false);
        return;
      }
      
      setUser(currentUser);
      
      try {
        const userEmail = currentUser.email;
        const apiToken = token || await fetchToken();

        if (!apiToken) {
          throw new Error("No se pudo obtener el token de la API para cargar los roles.");
        }

        const [myManagersResult, managedUsersResult, fetchedExporters, profileResult] = await Promise.all([
          getMyManagers(userEmail),
          getManagedUsers(userEmail),
          fetchExporterEmails(apiToken),
          getUserProfile(userEmail)
        ]);

        if (profileResult.error) {
            console.warn(`Could not get workspace profile for ${userEmail}: ${profileResult.error}`);
            setWorkspaceProfile(null);
        } else {
            setWorkspaceProfile(profileResult.profile ?? null);
        }

        if (myManagersResult.error) {
           console.error(`Could not get managers for ${userEmail}: ${myManagersResult.error}`);
           setMyManagers([]);
        } else {
          setMyManagers(myManagersResult.managers?.map(m => m.email) ?? []);
        }

        if (managedUsersResult.error) {
            console.error(`Could not get managed users for ${userEmail}: ${managedUsersResult.error}`);
            setIsManager(false);
            setManagedUsers([]);
        } else {
            const managedUserEmails = managedUsersResult.users?.map(u => u.email) ?? [];
            setIsManager(managedUserEmails.length > 0);
            setManagedUsers(managedUserEmails);
        }

        setIsExporter(fetchedExporters.includes(userEmail));
        
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Error al Cargar Roles',
          description: error.message || 'No se pudo cargar la configuración de roles y jerarquía.',
        });
        setIsManager(false);
        setIsExporter(false);
        setManagedUsers([]);
        setMyManagers([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    await signOut(auth);
  };

  const value = {
    user,
    workspaceProfile,
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
