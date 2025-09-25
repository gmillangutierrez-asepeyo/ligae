
'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isValid, parse } from 'date-fns';

import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import AppSidebar from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReceiptStore } from '@/lib/store';
import { uploadToStorage, saveToFirestore } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useToken } from '@/contexts/token-context';
import { Calendar as CalendarIcon, Loader2, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { sendEmail } from '@/ai/flows/send-email-flow';
import { useAuth } from '@/contexts/auth-context';
import { getMyManagers } from '../actions/hierarchy';


const FormSchema = z.object({
  sector: z.string().min(1, 'El sector es obligatorio'),
  importe: z.coerce.number().positive('El importe debe ser positivo'),
  usuario: z.string().email('Email inválido'),
  fecha: z.string().refine((val) => isValid(parse(val, 'dd/MM/yyyy', new Date())), {
    message: 'Fecha inválida. Usa el formato DD/MM/YYYY.',
  }),
  observaciones: z.string().max(250, 'Las observaciones no pueden exceder los 250 caracteres.').optional(),
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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setCalendarOpen] = useState(false);
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
        title: 'Error de Autenticación',
        description: 'No se encontró el token de acceso a la API. Por favor, intenta refrescarlo en la página de Ajustes.',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const fileName = `${generateUniqueId(data.usuario)}.jpg`;
      // No date conversion needed, it's already in dd/MM/yyyy
      const dataForApi = { ...data };
      
      const photoUrl = await uploadToStorage(croppedPhotoDataUri, fileName, token);
      
      await saveToFirestore({ ...dataForApi, photoUrl, fileName }, token);

      toast({ title: '¡Éxito!', description: 'Su recibo ha sido registrado y enviado para su aprobación.' });

      // Notify managers in a separate try-catch block
      try {
        const managersResult = await getMyManagers(data.usuario);
        
        if (managersResult.error) {
          throw new Error(managersResult.error);
        }

        const managersToNotify = managersResult.managers?.map(m => m.email) ?? [];
        
        if (managersToNotify.length > 0) {
            const subject = `Nuevo recibo de ${data.usuario} para su validación`;
            const htmlBody = `
                <p>Estimado/a gestor/a,</p>
                <p>Le informamos que el usuario <strong>${data.usuario}</strong> ha registrado un nuevo recibo que requiere su atención.</p>
                <p><strong>Detalles del recibo:</strong></p>
                <ul>
                    <li><strong>Importe:</strong> ${data.importe.toFixed(2)} €</li>
                    <li><strong>Fecha:</strong> ${data.fecha}</li>
                    <li><strong>Sector:</strong> ${data.sector}</li>
                </ul>
                <p>Por favor, acceda a la plataforma para revisar y aprobar la solicitud.</p>
                <p style="text-align: center; margin-top: 24px;">
                  <a href="https://ligae-asepeyo--ligae-asepeyo-463510.europe-west4.hosted.app/approvals" style="background-color: #29ABE2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Revisar Solicitud</a>
                </p>
                <p>Atentamente,<br>El equipo de LIGAE Asepeyo</p>
            `;
            const plainText = `Estimado/a gestor/a,\n\nLe informamos que el usuario ${data.usuario} ha registrado un nuevo recibo que requiere su atención.\n\nDetalles del recibo:\n- Importe: ${data.importe.toFixed(2)} €\n- Fecha: ${data.fecha}\n- Sector: ${data.sector}\n\nPor favor, acceda a la plataforma para revisar y aprobar la solicitud: https://ligae-asepeyo--ligae-asepeyo-463510.europe-west4.hosted.app/approvals\n\nAtentamente,\nEl equipo de LIGAE Asepeyo`;

            const emailPromises = managersToNotify.map(managerEmail => 
              sendEmail({
                to: managerEmail,
                subject,
                htmlBody,
                plainText,
              })
            );
          await Promise.all(emailPromises);
        } else {
             toast({
              variant: 'destructive',
              title: 'Gestor no encontrado',
              description: `No se ha podido notificar a ningún gestor para el usuario ${data.usuario}. El recibo ha sido guardado igualmente.`,
            });
        }
      } catch (emailError: any) {
        console.error("Fallo al enviar el email de notificación al manager:", emailError);
        toast({
          variant: 'destructive',
          title: 'Fallo al Notificar',
          description: 'El recibo se guardó, pero no se pudo notificar al manager.',
        });
      }
      
      router.push('/gallery');
      // Delay clearing state to prevent race conditions with navigation.
      setTimeout(() => {
        clearReceiptData();
      }, 100);

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fallo al Enviar',
        description: error.message || 'Ha ocurrido un error desconocido.',
      });
       setIsSubmitting(false);
    }
  };
  
  return (
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="order-last md:order-first">
          <CardHeader>
            <CardTitle>Datos Extraídos</CardTitle>
            <CardDescription>Edita los campos si es necesario.</CardDescription>
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
                <Label htmlFor="importe">Importe (€)</Label>
                <Controller
                  name="importe"
                  control={control}
                  render={({ field }) => <Input id="importe" type="number" step="0.01" {...field} />}
                />
                {errors.importe && <p className="text-destructive text-sm mt-1">{errors.importe.message}</p>}
              </div>
              <div>
                <Label htmlFor="fecha">Fecha</Label>
                <Controller
                  name="fecha"
                  control={control}
                  render={({ field }) => {
                    const [selectedDate, setSelectedDate] = useState<Date | undefined>();

                    useEffect(() => {
                        if (field.value) {
                            try {
                                const date = parse(field.value, 'dd/MM/yyyy', new Date());
                                if (isValid(date)) {
                                    setSelectedDate(date);
                                } else {
                                    setSelectedDate(undefined);
                                }
                            } catch (e) {
                                setSelectedDate(undefined);
                            }
                        }
                    }, [field.value]);

                    return (
                      <Popover open={isCalendarOpen} onOpenChange={setCalendarOpen}>
                        <div className="relative">
                          <Input
                            id="fecha"
                            {...field}
                            placeholder="DD/MM/YYYY"
                          />
                           <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                              aria-label="Abrir calendario"
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                        </div>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(format(date, 'dd/MM/yyyy'));
                                setCalendarOpen(false);
                              }
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errors.fecha && <p className="text-destructive text-sm mt-1">{errors.fecha.message}</p>}
              </div>
               <div>
                <Label htmlFor="observaciones">Observaciones</Label>
                 <Controller
                  name="observaciones"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="observaciones"
                      placeholder="Añade un comentario sobre el gasto..."
                      {...field}
                      value={field.value ?? ''}
                      maxLength={250}
                      className="resize-y"
                    />
                  )}
                />
                 {errors.observaciones && <p className="text-destructive text-sm mt-1">{errors.observaciones.message}</p>}
              </div>
               <div>
                <Label htmlFor="usuario">Email del Usuario</Label>
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
                {isTokenLoading ? 'Autenticando...' : 'Confirmar y Guardar'}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Imagen del Recibo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-lg overflow-hidden border">
              <Image
                src={croppedPhotoDataUri}
                alt="Recibo capturado"
                layout="fill"
                objectFit="contain"
              />
            </div>
          </CardContent>
        </Card>
      </div>
  )
}

function VerifyPage() {
  const router = useRouter();
  const { croppedPhotoDataUri, extractedData } = useReceiptStore();
  const { isTokenLoading } = useToken();
  const [initialFormData, setInitialFormData] = useState<FormData | null>(null);

  useEffect(() => {
    if (!croppedPhotoDataUri) {
      router.replace('/');
      return;
    }

    if (extractedData) {
      // This logic now runs only on the client, avoiding hydration errors.
      setInitialFormData({
        ...extractedData,
        fecha: extractedData.fecha, // Already in dd/MM/yyyy
        observaciones: '',
      });
    }
  }, [croppedPhotoDataUri, extractedData, router]);

  if (!initialFormData || !croppedPhotoDataUri) {
    return (
        <AuthGuard>
            <div className="flex flex-col min-h-screen w-full bg-background">
                <Header />
                <div className="flex flex-1">
                    <AppSidebar />
                    <main className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </main>
                </div>
             </div>
        </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen w-full bg-background">
        <Header />
        <div className="flex flex-1">
            <AppSidebar />
            <main className="flex-1 p-4 sm:p-6 md:p-8">
            <div className="mb-8">
                <h1 className="font-headline text-3xl font-bold">Verificar Recibo</h1>
                <p className="text-muted-foreground">Por favor, comprueba los datos extraídos y corrígelos si es necesario.</p>
            </div>
            <VerifyForm 
                initialData={initialFormData} 
                croppedPhotoDataUri={croppedPhotoDataUri}
            />
            {isTokenLoading && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="flex items-center gap-2 p-4 bg-background rounded-lg">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-foreground">Autenticando...</span>
                    </div>
                </div>
            )}
            </main>
        </div>
      </div>
    </AuthGuard>
  );
}

export default VerifyPage;

    