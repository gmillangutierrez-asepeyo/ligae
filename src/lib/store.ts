import { create } from 'zustand';
import type { ExtractReceiptDataOutput } from '@/ai/flows/extract-receipt-data';

interface ReceiptState {
  photoDataUri: string | null;
  extractedData: ExtractReceiptDataOutput | null;
  setReceiptData: (data: { photoDataUri: string; extractedData: ExtractReceiptDataOutput }) => void;
  clearReceiptData: () => void;
}

export const useReceiptStore = create<ReceiptState>((set) => ({
  photoDataUri: null,
  extractedData: null,
  setReceiptData: (data) => set({ photoDataUri: data.photoDataUri, extractedData: data.extractedData }),
  clearReceiptData: () => set({ photoDataUri: null, extractedData: null }),
}));
