import { create } from 'zustand';
import type { ExtractReceiptDataOutput } from '@/ai/flows/extract-receipt-data';

interface ReceiptState {
  originalPhotoDataUri: string | null;
  croppedPhotoDataUri: string | null;
  extractedData: ExtractReceiptDataOutput | null;
  setOriginalPhoto: (uri: string) => void;
  setCroppedPhotoAndData: (data: { croppedPhotoDataUri: string; extractedData: ExtractReceiptDataOutput }) => void;
  clearReceiptData: () => void;
}

export const useReceiptStore = create<ReceiptState>((set) => ({
  originalPhotoDataUri: null,
  croppedPhotoDataUri: null,
  extractedData: null,
  setOriginalPhoto: (uri) => set({ 
    originalPhotoDataUri: uri, 
    croppedPhotoDataUri: null, 
    extractedData: null 
  }),
  setCroppedPhotoAndData: (data) => set({ 
    croppedPhotoDataUri: data.croppedPhotoDataUri, 
    extractedData: data.extractedData 
  }),
  clearReceiptData: () => set({ 
    originalPhotoDataUri: null, 
    croppedPhotoDataUri: null, 
    extractedData: null 
  }),
}));
