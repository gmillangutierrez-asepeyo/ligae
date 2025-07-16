
'use client';

import React from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import AppSidebar from '@/components/app-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToken } from '@/contexts/token-context';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

function SettingsPage() {
  const { user } = useAuth();
  const { token, isTokenLoading, fetchToken } = useToken();

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
            <Header />
            <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                <CardTitle className="font-headline text-2xl">Perfil y Estado</CardTitle>
                <CardDescription>
                    Aquí está la información de tu perfil y el estado de la conexión.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="space-y-2">
                    <h3 className="font-semibold">Información del Usuario</h3>
                    <p className="text-sm text-muted-foreground">Nombre: {user?.displayName}</p>
                    <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
                </div>
                <div className="space-y-2">
                    <h3 className="font-semibold">Estado de Conexión de la API</h3>
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted">
                    {isTokenLoading ? (
                        <>
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-muted-foreground">Generando nuevo token de acceso...</span>
                        </>
                    ) : token ? (
                        <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-green-700 font-medium">Conexión activa</span>
                        </>
                    ) : (
                        <>
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <span className="text-destructive font-medium">Conexión inactiva. Por favor, refresca.</span>
                        </>
                    )}
                    </div>
                </div>
                <Button onClick={() => fetchToken()} className="w-full" disabled={isTokenLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isTokenLoading ? 'animate-spin' : ''}`} />
                    Refrescar Token de Acceso
                </Button>
                </CardContent>
            </Card>
            </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
