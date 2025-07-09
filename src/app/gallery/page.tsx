'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { format, isValid, parseISO } from 'date-fns';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, AlertCircle, Inbox, Eye } from 'lucide-react';
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
      <div className="flex items-center justify-center w-full h-full bg-secondary animate-pulse min-h-[400px]">
        <Loader2 className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !imgSrc) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[400px]">
        <div className="text-center p-2">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-xs text-muted-foreground mt-1">Error al cargar la imagen</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes="(max-width: 768px) 100vw, 50vw"
      style={{ objectFit: 'contain' }}
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
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </main>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold">Mis Recibos</h1>
            <p className="text-muted-foreground">Un historial de todos tus recibos enviados.</p>
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
        
        {viewingReceipt && token && (
            <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
                <DialogContent className="max-w-xl w-full">
                    <DialogHeader>
                        <DialogTitle>Recibo de {viewingReceipt.sector}</DialogTitle>
                        <DialogDescription>
                           {formatDate(viewingReceipt.fecha)} - €{viewingReceipt.importe.toFixed(2)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="relative aspect-auto max-h-[70vh] min-h-[400px] w-full mt-4">
                        <AuthenticatedImage
                            src={viewingReceipt.photoUrl}
                            alt={`Recibo de ${viewingReceipt.sector}`}
                            token={token}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        )}
      </div>
    </AuthGuard>
  );
}

export default GalleryPage;
