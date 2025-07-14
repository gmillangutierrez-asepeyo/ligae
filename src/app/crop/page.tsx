
'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

import { useReceiptStore } from '@/lib/store';
import { useAuth } from '@/contexts/auth-context';
import { extractReceiptData } from '@/ai/flows/extract-receipt-data';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Loader2, Scissors, Camera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function getCroppedImg(
  image: HTMLImageElement,
  crop: Crop,
  canvas: HTMLCanvasElement
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No 2d context');
  }

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(crop.width * scaleX * pixelRatio);
  canvas.height = Math.floor(crop.height * scaleY * pixelRatio);

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = 'high';

  const cropX = crop.x * scaleX;
  const cropY = crop.y * scaleY;

  ctx.drawImage(
    image,
    cropX,
    cropY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width * scaleX,
    crop.height * scaleY
  );
}


function CropPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const { originalPhotoDataUri, setCroppedPhotoAndData, clearReceiptData } = useReceiptStore();

  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop>();
  const [isLoading, setIsLoading] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!originalPhotoDataUri) {
      router.replace('/');
    }
  }, [originalPhotoDataUri, router]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
    });
  }

  const handleRetake = () => {
    clearReceiptData();
    router.push('/');
  };

  const handleConfirmCrop = useCallback(async () => {
    if (!completedCrop || !imgRef.current || !canvasRef.current || !user?.email) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo procesar el recorte. Inténtalo de nuevo.',
      });
      return;
    }

    setIsLoading(true);

    try {
      getCroppedImg(imgRef.current, completedCrop, canvasRef.current);
      const croppedPhotoDataUri = canvasRef.current.toDataURL('image/jpeg');

      const extractedData = await extractReceiptData({
        photoDataUri: croppedPhotoDataUri,
        usuario: user.email,
      });

      setCroppedPhotoAndData({
        croppedPhotoDataUri,
        extractedData,
      });

      router.push('/verify');
    } catch (e: any) {
      console.error("Error processing receipt:", e);
      toast({
        variant: 'destructive',
        title: 'Fallo al Procesar',
        description: e.message || 'No se pudo analizar el recibo. Inténtalo de nuevo.',
      });
      setIsLoading(false);
    }
  }, [completedCrop, router, setCroppedPhotoAndData, user?.email, toast]);

  if (!originalPhotoDataUri) {
    return null; // or a loading spinner
  }

  return (
    <div className="flex flex-col h-[100svh] w-full bg-background overflow-hidden">
      <Header />
      <main className="flex-1 flex flex-col items-center p-4 gap-4 overflow-hidden">
        <div className="w-full text-center shrink-0">
            <h1 className="font-headline text-2xl">Recortar Recibo</h1>
            <p className="text-muted-foreground">
              Ajusta el marco al recibo y confirma.
            </p>
        </div>
        <div className="w-full max-w-md flex-1 min-h-0 flex items-center justify-center relative">
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={undefined} // Free crop
            className="max-h-full flex items-center justify-center"
          >
            <Image
              ref={imgRef}
              alt="Recibo a recortar"
              src={originalPhotoDataUri}
              width={500}
              height={888} // approx 9/16 aspect ratio
              onLoad={onImageLoad}
              className="w-auto h-auto max-w-full max-h-full object-contain"
            />
          </ReactCrop>
        </div>
        
        <div className="w-full max-w-md flex items-center gap-4 shrink-0 pb-2">
            <Button variant="outline" onClick={handleRetake} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Hacer otra foto
            </Button>
            <Button onClick={handleConfirmCrop} disabled={isLoading || !completedCrop} className="flex-1">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scissors className="mr-2 h-4 w-4" />
              )}
              Confirmar
            </Button>
        </div>

        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-10">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p className="font-headline">Analizando recibo...</p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </main>
    </div>
  );
}

export default CropPage;
