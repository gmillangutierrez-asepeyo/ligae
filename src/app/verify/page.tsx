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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceiptStore } from '@/lib/store';
import { uploadToStorage, saveToFirestore } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useToken } from '@/contexts/token-context';
import { Loader2, Send } from 'lucide-react';


const FormSchema = z.object({
  sector: z.string().min(1, 'Sector is required'),
  importe: z.coerce.number().positive('Amount must be positive'),
  usuario: z.string().email('Invalid email'),
  fecha: z.string().min(1, 'Date is required'),
});

type FormData = z.infer<typeof FormSchema>;

const generateUniqueId = (userEmail: string) => `${userEmail.split('@')[0]}-${Date.now()}`;


function VerifyForm({
  initialData,
  croppedPhotoDataUri,
}: {
  initialData: FormData;
  croppedPhotoDataUri: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { clearReceiptData } = useReceiptStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { token, isTokenLoading } = useToken();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'No API access token found. Please try refreshing it on the Settings page.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const fileName = `${generateUniqueId(data.usuario)}.jpg`;
      const photoUrl = await uploadToStorage(croppedPhotoDataUri, fileName, token);
      
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
  
  return (
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Receipt Image</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-lg overflow-hidden border">
              <Image
                src={croppedPhotoDataUri}
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
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger id="sector">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="comida">Comida</SelectItem>
                        <SelectItem value="transporte">Transporte</SelectItem>
                        <SelectItem value="otros">Otros</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
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
              <Button type="submit" className="w-full" disabled={isSubmitting || isTokenLoading}>
                {isSubmitting || isTokenLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {isTokenLoading ? 'Authenticating...' : 'Confirm and Save'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
  )
}

function VerifyPage() {
  const router = useRouter();
  const { croppedPhotoDataUri, extractedData } = useReceiptStore();
  const { isTokenLoading } = useToken();

  useEffect(() => {
    // Redirect if there's no photo data to verify
    if (!croppedPhotoDataUri) {
      router.replace('/');
    }
  }, [croppedPhotoDataUri, router]);

  // Render a loading state or nothing until all required data is available
  if (!croppedPhotoDataUri || !extractedData) {
    return (
        <AuthGuard>
             <div className="flex flex-col min-h-screen bg-background">
                 <Header />
                 <main className="flex-1 flex items-center justify-center">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <h1 className="font-headline text-3xl font-bold">Verify Receipt</h1>
            <p className="text-muted-foreground">Please check the extracted data and correct it if necessary.</p>
          </div>
          <VerifyForm 
            initialData={extractedData} 
            croppedPhotoDataUri={croppedPhotoDataUri}
          />
           {isTokenLoading && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                <div className="flex items-center gap-2 p-4 bg-background rounded-lg">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-foreground">Authenticating...</span>
                </div>
            </div>
           )}
        </main>
      </div>
    </AuthGuard>
  );
}

export default VerifyPage;
