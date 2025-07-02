'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReceiptStore } from '@/lib/store';
import { uploadToStorage, saveToFirestore } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';


const FormSchema = z.object({
  sector: z.string().min(1, 'Sector is required'),
  importe: z.coerce.number().positive('Amount must be positive'),
  usuario: z.string().email('Invalid email'),
  fecha: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof FormSchema>;

// Need to install uuid and its types: npm install uuid && npm install -D @types/uuid
// Since I can't modify package.json other than dependencies, I'll use a simpler unique ID
const generateUniqueId = (userEmail: string) => `${userEmail.split('@')[0]}-${Date.now()}`;

function VerifyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { photoDataUri, extractedData, clearReceiptData } = useReceiptStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      sector: '',
      importe: 0,
      usuario: '',
      fecha: '',
    },
  });

  useEffect(() => {
    if (!photoDataUri || !extractedData) {
      router.replace('/');
    } else {
      reset({
        sector: extractedData.sector,
        importe: extractedData.importe,
        usuario: extractedData.usuario,
        fecha: extractedData.fecha,
      });
    }
    const storedToken = localStorage.getItem('oauth_token');
    if (!storedToken) {
       toast({
        variant: 'destructive',
        title: 'Token missing',
        description: 'OAuth token not found. Please add it in Settings.',
      });
      router.push('/settings');
    } else {
      setToken(storedToken);
    }
  }, [photoDataUri, extractedData, router, reset, toast]);

  const onSubmit = async (data: FormData) => {
    if (!photoDataUri) return;
    if (!token) {
      toast({ variant: 'destructive', title: 'Error', description: 'OAuth token is missing.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const fileName = `${generateUniqueId(data.usuario)}.jpg`;
      const photoUrl = await uploadToStorage(photoDataUri, fileName, token);

      await saveToFirestore({ ...data, photoUrl, fileName }, token);

      toast({ title: 'Success!', description: 'Your receipt has been saved.' });
      clearReceiptData();
      router.push('/gallery');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!photoDataUri) {
    return null; // or a loading/redirecting state
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
          <div className="mb-8">
            <h1 className="font-headline text-3xl font-bold">Verify Receipt</h1>
            <p className="text-muted-foreground">Please check the extracted data and correct it if necessary.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-lg overflow-hidden border">
                  <Image
                    src={photoDataUri}
                    alt="Captured receipt"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Extracted Data</CardTitle>
                <CardDescription>Edit the fields below as needed.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="sector">Sector</Label>
                    <Controller
                      name="sector"
                      control={control}
                      render={({ field }) => <Input id="sector" {...field} />}
                    />
                    {errors.sector && <p className="text-destructive text-sm mt-1">{errors.sector.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="importe">Amount (€)</Label>
                    <Controller
                      name="importe"
                      control={control}
                      render={({ field }) => <Input id="importe" type="number" step="0.01" {...field} />}
                    />
                    {errors.importe && <p className="text-destructive text-sm mt-1">{errors.importe.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="fecha">Date</Label>
                    <Controller
                      name="fecha"
                      control={control}
                      render={({ field }) => <Input id="fecha" {...field} />}
                    />
                    {errors.fecha && <p className="text-destructive text-sm mt-1">{errors.fecha.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="usuario">User Email</Label>
                    <Controller
                      name="usuario"
                      control={control}
                      render={({ field }) => <Input id="usuario" type="email" {...field} disabled />}
                    />
                    {errors.usuario && <p className="text-destructive text-sm mt-1">{errors.usuario.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Confirm and Save
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

export default VerifyPage;
