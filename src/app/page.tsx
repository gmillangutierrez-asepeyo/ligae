'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Camera, Upload, ArrowLeft } from 'lucide-react';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useReceiptStore } from '@/lib/store';
import Header from '@/components/header';
import ReceiptEuroIcon from '@/components/icons/receipt-euro-icon';

function LoginView() {
  const { signIn, loading } = useAuth();
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center mb-2">
            <ReceiptEuroIcon className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">LIGAE</CardTitle>
          <p className="text-muted-foreground font-headline">ASEPEYO</p>
          <CardDescription className="pt-2">Inicia sesión para gestionar tus recibos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signIn} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Iniciar Sesión con Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SelectionView({ setMode }: { setMode: (mode: 'camera' | 'selection') => void }) {
  const router = useRouter();
  const setOriginalPhoto = useReceiptStore((state) => state.setOriginalPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setOriginalPhoto(dataUri);
        router.push('/crop');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
        <div className="text-center">
            <h1 className="font-headline text-3xl">Enviar un Recibo</h1>
            <p className="text-muted-foreground mt-2">Elige cómo quieres enviar tu recibo.</p>
        </div>
        <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => setMode('camera')}>
                <Camera className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="font-headline text-xl">Hacer Foto</CardTitle>
                <CardDescription>Usa la cámara de tu dispositivo.</CardDescription>
            </Card>
             <Card className="flex flex-col items-center justify-center p-6 text-center hover:bg-accent/50 transition-colors cursor-pointer" onClick={handleUploadClick}>
                <Upload className="h-12 w-12 text-primary mb-4" />
                <CardTitle className="font-headline text-xl">Subir Imagen</CardTitle>
                <CardDescription>Selecciona un archivo de tu dispositivo.</CardDescription>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                />
            </Card>
        </div>
      </main>
    </div>
  );
}


function CameraView({ setMode }: { setMode: (mode: 'camera' | 'selection') => void }) {
  const router = useRouter();
  const setOriginalPhoto = useReceiptStore((state) => state.setOriginalPhoto);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Por favor, comprueba los permisos.");
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const originalPhotoDataUri = canvas.toDataURL('image/jpeg');
      setOriginalPhoto(originalPhotoDataUri);
      router.push('/crop');
    }
  }, [router, setOriginalPhoto]);

  return (
    <div className="h-[100svh] w-full bg-black overflow-hidden">
      <main className="relative h-full w-full">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[90%] h-[90%] border-2 border-white/50 rounded-md" />
        </div>
        
        <Button variant="ghost" onClick={() => setMode('selection')} className="absolute top-4 left-4 z-20 text-white bg-black/30 hover:bg-black/50">
            <ArrowLeft className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Volver</span>
        </Button>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-full px-6 flex flex-col items-center gap-4">
            <p className="text-white text-center text-shadow-lg">Centra el recibo y haz la foto.</p>
            <Button onClick={handleCapture} size="lg" className="rounded-full w-20 h-20 bg-accent hover:bg-accent/90 shadow-2xl">
              <Camera className="h-10 w-10 text-accent-foreground" />
            </Button>
        </div>

        {error && <p className="absolute top-20 left-1/2 -translate-x-1/2 text-destructive bg-background/80 p-2 rounded-md z-20">{error}</p>}
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'selection' | 'camera'>('selection');

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
      return <LoginView />;
  }

  if (mode === 'selection') {
    return <SelectionView setMode={setMode} />;
  }

  return <CameraView setMode={setMode} />;
}
