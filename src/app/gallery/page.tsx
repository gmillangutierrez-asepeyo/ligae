'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Trash2, AlertCircle, Inbox } from 'lucide-react';
import { fetchTickets, deleteFromFirestore, deleteFromStorage } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
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
} from "@/components/ui/alert-dialog"

interface Receipt {
  id: string;
  sector: { stringValue: string };
  importe: { doubleValue: number };
  fecha: { stringValue: string };
  photoUrl: { stringValue: string };
  fileName: { stringValue: string };
}

// Component to render a single receipt card, handling image fetching internally
function ReceiptCard({ receipt, token, onDelete }: { receipt: Receipt; token: string | null; onDelete: (receipt: Receipt) => Promise<void> }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      if (!token || !receipt.photoUrl.stringValue) return;
      try {
        const res = await fetch(receipt.photoUrl.stringValue, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch image');
        const blob = await res.blob();
        if (isMounted) {
          setImageUrl(URL.createObjectURL(blob));
        }
      } catch (error) {
        console.error('Error fetching receipt image:', error);
      }
    };
    fetchImage();

    return () => {
      isMounted = false;
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [receipt.photoUrl.stringValue, token, imageUrl]);

  const handleDeleteClick = async () => {
    setIsDeleting(true);
    await onDelete(receipt);
    // No need to setIsDeleting(false) as the component will unmount
  };

  return (
    <Card className="overflow-hidden group">
      <CardHeader className="p-0">
        <div className="relative aspect-square">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Receipt for ${receipt.sector.stringValue}`}
              layout="fill"
              objectFit="cover"
              className="transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <CardTitle className="text-lg font-headline capitalize">{receipt.sector.stringValue}</CardTitle>
        <p className="font-bold text-primary text-xl">€{receipt.importe.doubleValue.toFixed(2)}</p>
        <p className="text-sm text-muted-foreground">{receipt.fecha.stringValue}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Button variant="destructive" className="w-full" disabled={isDeleting}>
               {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                Delete
             </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the receipt
                and remove its data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteClick}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}


function GalleryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const loadReceipts = useCallback(async (authToken: string) => {
    if (!user?.email) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets(user.email, authToken);
      setReceipts(data);
    } catch (e: any) {
      setError(e.message || "Failed to load receipts.");
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    const storedToken = localStorage.getItem('oauth_token');
    if (storedToken) {
      setToken(storedToken);
      loadReceipts(storedToken);
    } else {
      setError("OAuth token not found. Please set it in Settings.");
      setLoading(false);
    }
  }, [loadReceipts]);

  const handleDelete = async (receipt: Receipt) => {
    if (!token) {
      toast({ variant: 'destructive', title: 'Error', description: 'OAuth token not found.' });
      return;
    }
    try {
      await deleteFromStorage(receipt.fileName.stringValue, token);
      await deleteFromFirestore(receipt.id, token);
      setReceipts(prev => prev.filter(r => r.id !== receipt.id));
      toast({ title: 'Success', description: 'Receipt deleted successfully.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: e.message });
    }
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold">Receipt Gallery</h1>
            <p className="text-muted-foreground">A history of all your submitted receipts.</p>
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
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">No receipts</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by capturing a new receipt.</p>
            </div>
          )}

          {!loading && !error && receipts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {receipts.map((receipt) => (
                <ReceiptCard key={receipt.id} receipt={receipt} token={token} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}

export default GalleryPage;
