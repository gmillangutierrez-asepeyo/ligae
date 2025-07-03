'use client';

import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn, Camera, Loader, Receipt } from 'lucide-react';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useReceiptStore } from '@/lib/store';
import { extractReceiptData } from '@/ai/flows/extract-receipt-data';
import Header from '@/components/header';

function LoginView() {
  const { signIn, loading } = useAuth();
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center mb-2">
            <Receipt className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">LIGAE</CardTitle>
          <p className="text-muted-foreground font-headline">ASEPEYO</p>
          <CardDescription className="pt-2">Sign in to manage your receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={signIn} disabled={loading} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
            Sign In with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CaptureView() {
  const { user } = useAuth();
  const router = useRouter();
  const setReceiptData = useReceiptStore((state) => state.setReceiptData);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
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
      setError("Could not access camera. Please check permissions.");
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

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsLoading(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const photoDataUri = canvas.toDataURL('image/jpeg');
      
      try {
        if (!user?.email) throw new Error("User email not found.");
        
        setLoadingMessage('Analyzing receipt...');
        const extractedData = await extractReceiptData({ photoDataUri: photoDataUri, usuario: user.email });
        
        setReceiptData({ photoDataUri: photoDataUri, extractedData });
        router.push('/verify');
      } catch (e) {
        console.error("Error processing receipt:", e);
        setError("Failed to process receipt. Please try again.");
        setIsLoading(false);
        setLoadingMessage('');
      }
    }
  }, [router, setReceiptData, user?.email]);

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <Header />
      <main className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
        <h1 className="font-headline text-2xl text-center">Capture Receipt</h1>
        <p className="text-muted-foreground text-center mb-4">
          Center the receipt within the frame and take a photo.
        </p>
        <div className="relative w-full max-w-md aspect-[9/16] rounded-lg overflow-hidden border-4 border-dashed border-primary/50 bg-secondary shadow-lg">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[90%] h-[90%] border-2 border-white/50 rounded-md" />
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
            <Button onClick={handleCapture} disabled={isLoading} size="lg" className="rounded-full w-20 h-20 bg-accent hover:bg-accent/90 shadow-2xl">
              <Camera className="h-10 w-10 text-accent-foreground" />
            </Button>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
              <Loader className="h-12 w-12 animate-spin mb-4" />
              <p className="font-headline">{loadingMessage || 'Processing...'}</p>
            </div>
          )}
        </div>
        {error && <p className="text-destructive text-center">{error}</p>}
        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}

export default function HomePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return user ? <CaptureView /> : <LoginView />;
}
