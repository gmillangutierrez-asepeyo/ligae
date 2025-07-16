
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import AppSidebar from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2, AlertCircle, Inbox, ThumbsUp, ThumbsDown, Eye, RefreshCw } from 'lucide-react';
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
import { sendEmail } from '@/ai/flows/send-email-flow';
import { cn } from '@/lib/utils';


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
    const [approvalReason, setApprovalReason] = useState('');
    const [viewingReceipt, setViewingReceipt] = useState<Receipt | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Wait until auth state is fully resolved (including hierarchy) before checking manager status
    useEffect(() => {
        if (isMounted && !authLoading) {
            if (!isManager) {
                toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'Esta página es solo para managers.' });
                router.replace('/');
            }
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

    // This effect now correctly depends on authLoading to ensure isManager is stable
    useEffect(() => {
        if (isManager && token && !authLoading) {
            loadPendingReceipts();
        }
    }, [isManager, token, authLoading, loadPendingReceipts]);


    const handleOpenDialog = (receipt: Receipt, type: 'approve' | 'deny') => {
        setCurrentReceipt(receipt);
        setAction(type);
        setApprovalReason(receipt.motivo || '');
    };

    const handleCloseDialog = () => {
        setCurrentReceipt(null);
        setAction(null);
        setApprovalReason('');
    };

    const handleSubmit = async () => {
        if (!currentReceipt || !action || !token) return;
        if (action === 'deny' && !approvalReason.trim()) {
            toast({ variant: 'destructive', title: 'Razón requerida', description: 'Debes indicar una razón para denegar el recibo.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const newState = action === 'approve' ? 'aprobado' : 'denegado';
            await updateTicketStatus(currentReceipt.id, {
                estado: newState,
                motivo: approvalReason,
            }, token);

            setReceipts(prev => prev.filter(r => r.id !== currentReceipt.id));
            toast({ title: 'Éxito', description: `Recibo ${newState} correctamente.` });
            
            // Notify user
            try {
              await sendEmail({
                  to: currentReceipt.usuario,
                  subject: `Tu recibo ha sido ${newState}`,
                  text: `Hola, tu recibo de ${currentReceipt.importe.toFixed(2)}€ con fecha ${currentReceipt.fecha} ha sido ${newState}. ${approvalReason ? `Razón: ${approvalReason}` : ''}`,
                  html: `<p>Hola,</p><p>Tu recibo de <strong>${currentReceipt.importe.toFixed(2)}€</strong> con fecha ${currentReceipt.fecha} ha sido <strong>${newState}</strong>.</p>${approvalReason ? `<p><strong>Razón:</strong> ${approvalReason}</p>` : ''}<p>Puedes ver los detalles en el <a href="https://ligae-asepeyo-624538650771.europe-southwest1.run.app/gallery">historial de recibos</a>.</p><div>{{EMAIL_FOOTER}}</div>`,
              });
            } catch (emailError: any) {
              console.error("Fallo al enviar el email de notificación al usuario:", emailError);
              toast({
                variant: 'destructive',
                title: 'Fallo al Notificar',
                description: 'El estado se actualizó, pero no se pudo notificar al usuario por email.',
              });
            }

            handleCloseDialog();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Fallo al Actualizar', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Show a loading spinner until authentication and role checks are complete.
    if (authLoading || !isManager) {
        return (
            <AuthGuard>
                <div className="flex h-screen bg-background">
                    <AppSidebar />
                    <div className="flex flex-col flex-1 min-w-0">
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
            <div className="flex h-screen w-full bg-background">
                <AppSidebar />
                <div className="flex flex-col flex-1 min-w-0 h-screen">
                    <Header />
                    <main className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 overflow-y-auto">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                            <div>
                                <h1 className="font-headline text-3xl font-bold">Aprobación de Recibos</h1>
                                <p className="text-muted-foreground">Recibos pendientes de revisión.</p>
                            </div>
                            <Button onClick={() => loadPendingReceipts()} disabled={loading || isTokenLoading}>
                                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                Refrescar
                            </Button>
                        </div>

                        {loading && (
                            <div className="flex justify-center items-center h-64">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                        )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {!loading && !error && receipts.length === 0 && (
                            <div className="text-center py-16 border-2 border-dashed rounded-lg">
                                <Inbox className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Bandeja de entrada vacía</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">No hay recibos pendientes de aprobación de tus usuarios.</p>
                            </div>
                        )}

                        {!loading && !error && receipts.length > 0 && (
                            <div className="w-full overflow-x-auto rounded-lg border bg-card">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="whitespace-nowrap">Usuario</TableHead>
                                            <TableHead>Sector</TableHead>
                                            <TableHead>Importe</TableHead>
                                            <TableHead className="whitespace-nowrap">Fecha</TableHead>
                                            <TableHead>Observaciones</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {receipts.map((receipt) => (
                                            <TableRow key={receipt.id} className={cn(
                                                (receipt.estado === 'aprobado' || receipt.estado === 'denegado') && 'bg-muted/50'
                                            )}>
                                                <TableCell className="font-medium whitespace-nowrap">{receipt.usuario}</TableCell>
                                                <TableCell className="capitalize">{receipt.sector}</TableCell>
                                                <TableCell className="whitespace-nowrap">€{receipt.importe.toFixed(2)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{receipt.fecha}</TableCell>
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
                            </div>
                        )}
                    </main>
                </div>
                
                {/* Approval/Denial Dialog */}
                <Dialog open={!!action} onOpenChange={(open) => !open && handleCloseDialog()}>
                    <DialogContent className="sm:max-w-md top-1/4 sm:top-1/2">
                        <DialogHeader>
                            <DialogTitle>
                                {action === 'approve' ? 'Aprobar Recibo' : 'Denegar Recibo'}
                            </DialogTitle>
                            <DialogDescription>
                                {action === 'approve' ? 'El estado del recibo cambiará a "aprobado".' : 'El estado del recibo cambiará a "denegado".'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-2">
                            <Label htmlFor="motivo">
                                {action === 'deny' ? 'Motivo de Denegación' : 'Comentario (Opcional)'}
                            </Label>
                            <Textarea
                                id="motivo"
                                value={approvalReason}
                                onChange={(e) => setApprovalReason(e.target.value)}
                                placeholder={action === 'deny' ? 'Añade una razón para la denegación...' : 'Añade un comentario opcional...'}
                                maxLength={250}
                                className="resize-y"
                            />
                        </div>
                        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-0">
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCloseDialog}>Cancelar</Button>
                            </DialogClose>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {action === 'approve' ? 'Confirmar Aprobación' : 'Confirmar Denegación'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Image and Details Dialog */}
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
                                        Revisa la información del recibo enviado por {viewingReceipt.usuario}.
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
                                                <span className="font-medium">{viewingReceipt.fecha}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Sector:</span>
                                                <span className="font-medium capitalize">{viewingReceipt.sector}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground">Usuario:</span>
                                                <span className="font-medium">{viewingReceipt.usuario}</span>
                                            </div>
                                            <div className="space-y-1 pt-2">
                                                <span className="text-muted-foreground">Observaciones del usuario:</span>
                                                <p className="font-medium p-2 bg-muted/50 rounded-md break-words">{viewingReceipt.observaciones || 'Ninguna'}</p>
                                            </div>
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

export default ApprovalsPage;

    
