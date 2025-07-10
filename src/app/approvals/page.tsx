'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Inbox, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import { fetchAllPendingTickets, updateTicketStatus, type CleanReceipt } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { useToken } from '@/contexts/token-context';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";


type Receipt = CleanReceipt;

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


function ApprovalsPage() {
    const router = useRouter();
    const { user, isManager, managedUsers, loading: authLoading } = useAuth();
    const { token, isTokenLoading } = useToken();
    const { toast } = useToast();

    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [action, setAction] = useState<'approve' | 'deny' | null>(null);
    const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
    const [denialReason, setDenialReason] = useState('');
    const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (isMounted && !authLoading && !isManager) {
            toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Esta página es solo para managers.' });
            router.replace('/');
        }
    }, [isManager, authLoading, router, toast, isMounted]);

    const loadPendingReceipts = useCallback(async () => {
        if (!token || !user?.email || !isManager) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            if (managedUsers.length === 0) {
                setReceipts([]);
                setError("No tienes usuarios asignados para aprobar recibos.");
                setLoading(false);
                return;
            }

            const data = await fetchAllPendingTickets(token, managedUsers);
            setReceipts(data);
        } catch (e: any) {
            setError(e.message || "Error al cargar los recibos para aprobación.");
        } finally {
            setLoading(false);
        }
    }, [token, user?.email, isManager, managedUsers]);

    useEffect(() => {
        if (isManager && token && isMounted && !authLoading) {
            loadPendingReceipts();
        }
    }, [isManager, token, isMounted, authLoading, loadPendingReceipts]);


    const handleOpenDialog = (receipt: Receipt, type: 'approve' | 'deny') => {
        setCurrentReceipt(receipt);
        setAction(type);
        setDenialReason(receipt.observaciones || '');
    };

    const handleCloseDialog = () => {
        setCurrentReceipt(null);
        setAction(null);
        setDenialReason('');
    };

    const handleSubmit = async () => {
        if (!currentReceipt || !action || !token) return;
        if (action === 'deny' && !denialReason.trim()) {
            toast({ variant: 'destructive', title: 'Razón requerida', description: 'Debes indicar una razón para denegar el recibo.' });
            return;
        }

        setIsSubmitting(true);
        try {
            await updateTicketStatus(currentReceipt.id, {
                estado: action === 'approve' ? 'aprobado' : 'denegado',
                observaciones: denialReason,
            }, token);

            setReceipts(prev => prev.filter(r => r.id !== currentReceipt.id));
            toast({ title: 'Éxito', description: `Recibo ${action === 'approve' ? 'aprobado' : 'denegado'} correctamente.` });
            handleCloseDialog();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fallo al Actualizar', description: e.message });
        } finally {
            setIsSubmitting(false);
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
    
    if (authLoading || !isManager) {
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
                        <h1 className="font-headline text-3xl font-bold">Aprobación de Recibos</h1>
                        <p className="text-muted-foreground">Recibos pendientes de revisión.</p>
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
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Bandeja de entrada vacía</h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No hay recibos pendientes de aprobación de tus usuarios.</p>
                        </div>
                    )}

                    {!loading && !isTokenLoading && !error && receipts.length > 0 && (
                        <Card>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Usuario</TableHead>
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
                                            <TableCell className="font-medium">{receipt.usuario}</TableCell>
                                            <TableCell className="capitalize">{receipt.sector}</TableCell>
                                            <TableCell>€{receipt.importe.toFixed(2)}</TableCell>
                                            <TableCell>{formatDate(receipt.fecha)}</TableCell>
                                            <TableCell className="max-w-[200px] truncate">{receipt.observaciones || '-'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="outline" size="icon" onClick={() => setViewingReceipt(receipt)}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700" onClick={() => handleOpenDialog(receipt, 'approve')}>
                                                        <ThumbsUp className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleOpenDialog(receipt, 'deny')}>
                                                        <ThumbsDown className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </main>
                
                {/* Approval/Denial Dialog */}
                <Dialog open={!!action} onOpenChange={(open) => !open && handleCloseDialog()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {action === 'approve' ? 'Aprobar Recibo' : 'Denegar Recibo'}
                            </DialogTitle>
                            <DialogDescription>
                                {action === 'approve' ? 'El estado del recibo cambiará a "aprobado".' : 'El estado del recibo cambiará a "denegado".'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="observaciones">Observaciones (Razón si se deniega)</Label>
                            <Textarea
                                id="observaciones"
                                value={denialReason}
                                onChange={(e) => setDenialReason(e.target.value)}
                                placeholder={action === 'deny' ? 'Añade una razón para la denegación...' : 'Añade un comentario opcional...'}
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                            </DialogClose>
                            <Button onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {action === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Denegación'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Image Dialog */}
                {viewingReceipt && token && (
                    <Dialog open={!!viewingReceipt} onOpenChange={(open) => !open && setViewingReceipt(null)}>
                        <DialogContent className="max-w-xl w-full">
                            <DialogHeader>
                                <DialogTitle>Recibo de {viewingReceipt.sector} ({viewingReceipt.usuario})</DialogTitle>
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

export default ApprovalsPage;
