
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { format, isValid, parseISO } from 'date-fns';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import AppSidebar from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, AlertCircle, Inbox, Eye, RefreshCw } from 'lucide-react';
import { fetchTickets, deleteFromFirestore, deleteFromStorage, type CleanReceipt } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToken } from '@/contexts/token-context';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// This component fetches a private image from GCS using a token and displays it.
function AuthenticatedImage({ src, alt, token }: { src: string; alt: string; token: string | null }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src || !token) {
      if (token !== null) setError(true);
      setLoading(false);
      return;
    }

    let objectUrl: string | null = null;
    const fetchImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const consoleUrl = src;
        const urlParts = new URL(consoleUrl);
        const bucket = urlParts.pathname.split('/')[1];
        const objectName = urlParts.pathname.split('/').slice(2).join('/');
        
        if (!bucket || !objectName) {
            throw new Error('Invalid GCS URL format');
        }

        const apiUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectName)}?alt=media`;

        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImgSrc(objectUrl);
      } catch (e) {
        console.error("Error fetching authenticated image:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-secondary animate-pulse">
        <Loader2 className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !imgSrc) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-secondary rounded-lg text-center p-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="mt-2 text-sm text-destructive-foreground">Error al cargar la imagen</p>
        <p className="text-xs text-muted-foreground mt-1">Comprueba la consola para más detalles.</p>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={400}
      height={800}
      className="h-auto w-full object-contain"
    />
  );
}

// The Receipt type now uses the clean interface from api.ts
type Receipt = CleanReceipt;

function DeleteButton({ receipt, onDelete }: { receipt: Receipt; onDelete: (receipt: Receipt) => Promise<void> }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    await onDelete(receipt);
    // Component will unmount, no need to setIsDeleting(false)
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isDeleting} className="text-destructive hover:text-destructive">
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Esto eliminará permanentemente el recibo
            y sus datos de nuestros servidores.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteClick}>
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Helper to render a status badge with appropriate styling
function StatusBadge({ status }: { status: string }) {
  const variant: "default" | "secondary" | "destructive" =
    status === 'aprobado' ? 'default' :
    status === 'denegado' ? 'destructive' :
    'secondary';

  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}


function GalleryPage() {
  const { user } = useAuth();
  const { token, isTokenLoading } = useToken();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const loadReceipts = useCallback(async () => {
    if (!user?.email || isTokenLoading) return;

    if (!token) {
      setError("No se pudo generar el token de acceso a la API. Intenta refrescarlo en la página de Ajustes o vuelve a iniciar sesión.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets(user.email, token);
      setReceipts(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar los recibos.");
    } finally {
      setLoading(false);
    }
  }, [user?.email, token, isTokenLoading]);

  useEffect(() => {
    if(!isTokenLoading && isMounted) {
      loadReceipts();
    }
  }, [loadReceipts, isTokenLoading, isMounted]);

  const handleDelete = async (receipt: Receipt) => {
    if (!token) {
      toast({ variant: 'destructive', title: 'Fallo al Eliminar', description: 'Token de la API no encontrado.' });
      return;
    }
    try {
      await deleteFromStorage(receipt.fileName, token);
      await deleteFromFirestore(receipt.id, token);
      setReceipts(prev => prev.filter(r => r.id !== receipt.id));
      toast({ title: 'Éxito', description: 'Recibo eliminado correctamente.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Fallo al Eliminar', description: e.message });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (dateString && isValid(parseISO(dateString))) {
        return format(parseISO(dateString), 'dd/MM/yyyy');
      }
      return dateString;
    } catch (e) {
      return dateString;
    }
  };

  if (!isMounted) {
    return (
       <AuthGuard>
        <div className="flex h-screen bg-background">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </main>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1">
            <Header />
            <main className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                <div>
                <h1 className="font-headline text-3xl font-bold">Mis Recibos</h1>
                <p className="text-muted-foreground">Un historial de todos tus recibos enviados.</p>
                </div>
                <Button onClick={() => loadReceipts()} disabled={loading || isTokenLoading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refrescar
                </Button>
            </div>

            {(loading || isTokenLoading) && (
                <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                {isTokenLoading && <p className="ml-4 text-muted-foreground">Autenticando...</p>}
                </div>
            )}

            {error && (
                <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!loading && !isTokenLoading && !error && receipts.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No hay recibos</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Empieza capturando un nuevo recibo.</p>
                </div>
            )}

            {!loading && !isTokenLoading && !error && receipts.length > 0 && (
                <Card>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Sector</TableHead>
                        <TableHead>Importe</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Observaciones</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {receipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                        <TableCell className="font-medium capitalize">{receipt.sector}</TableCell>
                        <TableCell>€{receipt.importe.toFixed(2)}</TableCell>
                        <TableCell>{formatDate(receipt.fecha)}</TableCell>
                        <TableCell>
                            <StatusBadge status={receipt.estado} />
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{receipt.observaciones || '-'}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => setViewingReceipt(receipt)}>
                                <Eye className="h-4 w-4" />
                            </Button>
                            <DeleteButton receipt={receipt} onDelete={handleDelete} />
                            </div>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </Card>
            )}
            </main>
        </div>
        
        {viewingReceipt && token && (
            <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
                <DialogContent className="max-w-4xl w-full max-h-[90svh] overflow-y-auto">
                    <div className="flex flex-col md:flex-row gap-6 p-6">
                         <div className="w-full md:w-1/2">
                            <DialogHeader>
                                <DialogTitle className="md:hidden mb-2">Imagen del Recibo</DialogTitle>
                            </DialogHeader>
                            <div className="relative w-full rounded-lg overflow-hidden border">
                                <AuthenticatedImage
                                    src={viewingReceipt.photoUrl}
                                    alt={`Recibo de ${viewingReceipt.sector}`}
                                    token={token}
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 min-w-0">
                            <DialogHeader>
                                <DialogTitle>Detalles del Recibo</DialogTitle>
                                <DialogDescription>
                                Resumen completo de la información.
                                </DialogDescription>
                            </DialogHeader>
                            <Card className="mt-4">
                                <CardContent className="p-4 space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Importe:</span>
                                        <span className="font-medium">€{viewingReceipt.importe.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Fecha:</span>
                                        <span className="font-medium">{formatDate(viewingReceipt.fecha)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sector:</span>
                                        <span className="font-medium capitalize">{viewingReceipt.sector}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Estado:</span>
                                        <StatusBadge status={viewingReceipt.estado} />
                                    </div>
                                    <div className="space-y-1 pt-2">
                                        <span className="text-muted-foreground">Observaciones del usuario:</span>
                                        <p className="font-medium p-2 bg-muted/50 rounded-md break-words">{viewingReceipt.observaciones || 'Ninguna'}</p>
                                    </div>
                                    {(viewingReceipt.estado === 'aprobado' || viewingReceipt.estado === 'denegado') && (
                                        <div className="space-y-1 pt-2">
                                            <span className="text-muted-foreground">Motivo del manager:</span>
                                            <p className="font-medium p-2 bg-muted/50 rounded-md break-words">{viewingReceipt.motivo || 'Sin motivo'}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        )}
      </div>
    </AuthGuard>
  );
}

export default GalleryPage;

    