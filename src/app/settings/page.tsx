
'use client';

import React, { useState } from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import AppSidebar from '@/components/app-sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToken } from '@/contexts/token-context';
import { CheckCircle, AlertCircle, Loader2, RefreshCw, Users, UserCheck, FileDown, UserSearch } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';
import { getUserProfile, type UserProfile } from '../actions/getUserProfile';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SettingsPage() {
  const { user, isManager, isExporter, managedUsers, myManagers } = useAuth();
  const { token, isTokenLoading, fetchToken } = useToken();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const handleFetchProfile = async () => {
    if (!user?.email) return;

    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    try {
      const result = await getUserProfile(user.email);
      if (result.error) {
        throw new Error(result.error);
      }
      setProfile(result.profile ?? null);
    } catch (e: any) {
      setProfileError(e.message);
      toast({
        variant: 'destructive',
        title: 'Error al Cargar Perfil',
        description: e.message || 'No se pudo obtener la información del perfil de Workspace.',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col h-screen w-full bg-background">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Perfil y Estado</CardTitle>
                  <CardDescription>
                    Información de tu perfil y estado de la conexión.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4 p-4 rounded-lg border">
                    <h3 className="font-semibold text-lg">Información del Usuario</h3>
                    <p className="text-sm text-muted-foreground">Nombre: {user?.displayName}</p>
                    <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
                  </div>

                  <div className="space-y-4 p-4 rounded-lg border">
                    <h3 className="font-semibold text-lg">Roles y Jerarquía</h3>
                    {isManager && (
                      <div className="space-y-2">
                        <div className='flex items-center gap-2'>
                          <Users className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Usuarios que gestionas</h4>
                        </div>
                        {managedUsers.length > 0 ? (
                          <div className="flex flex-wrap gap-2 pl-7">
                            {managedUsers.map(email => <Badge key={email} variant="secondary">{email}</Badge>)}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground pl-7">No tienes usuarios asignados.</p>
                        )}
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className='flex items-center gap-2'>
                        <UserCheck className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Tus managers (aprueban tus recibos)</h4>
                      </div>
                      {myManagers.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pl-7">
                          {myManagers.map(email => <Badge key={email} variant="secondary">{email}</Badge>)}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-7">No tienes un manager asignado en la jerarquía.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className='flex items-center justify-between gap-2'>
                        <div className="flex items-center gap-2">
                          <FileDown className="h-5 w-5 text-primary" />
                          <h4 className="font-medium">Permisos de Exportación</h4>
                        </div>
                        <Badge variant={isExporter ? "default" : "secondary"}>{isExporter ? "Activo" : "Inactivo"}</Badge>
                      </div>
                    </div>
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
                </CardContent>
                <CardFooter>
                  <Button onClick={() => fetchToken()} className="w-full" disabled={isTokenLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isTokenLoading ? 'animate-spin' : ''}`} />
                    Refrescar Token de Acceso
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Perfil de Google Workspace</CardTitle>
                  <CardDescription>
                    Información adicional obtenida de tu perfil de empresa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading && (
                    <div className="flex justify-center items-center h-24">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                  {profileError && (
                     <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error de Permisos</AlertTitle>
                        <AlertDescription>{profileError}</AlertDescription>
                    </Alert>
                  )}
                  {profile && (
                    <div className="space-y-2 text-sm p-4 border rounded-lg">
                      {profile.organizations && profile.organizations.length > 0 && (
                         <>
                            {profile.organizations[0].title && <p><strong className="text-muted-foreground">Puesto:</strong> {profile.organizations[0].title}</p>}
                            {profile.organizations[0].department && <p><strong className="text-muted-foreground">Departamento:</strong> {profile.organizations[0].department}</p>}
                            {profile.organizations[0].costCenter && <p><strong className="text-muted-foreground">Centro de Coste:</strong> {profile.organizations[0].costCenter}</p>}
                         </>
                      )}
                      {profile.phones && profile.phones.map((phone, index) => (
                          <p key={index}><strong className="text-muted-foreground capitalize">{phone.type || 'Teléfono'}:</strong> {phone.value}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button onClick={handleFetchProfile} className="w-full" disabled={profileLoading}>
                    <UserSearch className={`mr-2 h-4 w-4 ${profileLoading ? 'animate-spin' : ''}`} />
                    {profile ? 'Recargar Datos del Perfil' : 'Cargar Datos del Perfil'}
                  </Button>
                </CardFooter>
              </Card>

            </div>
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
