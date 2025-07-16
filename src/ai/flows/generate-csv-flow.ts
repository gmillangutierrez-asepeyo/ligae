'use server';

/**
 * @fileOverview A Genkit flow for generating a CSV string from an array of receipt data.
 * This flow is designed to be called to create CSV files for export.
 *
 * - generateCsv - A function that handles the CSV generation process.
 * - GenerateCsvInput - The input type for the generateCsv function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { type CleanReceipt } from '@/lib/api';

// We don't need a full Zod schema for the input if we trust the server-side source.
// However, for type safety in the function signature, we can define a type.
export type GenerateCsvInput = CleanReceipt[];

/**
 * Generates a CSV string from an array of receipt objects.
 * @param receipts The array of receipt data to be converted to CSV.
 * @returns A promise that resolves with the CSV content as a string.
 */
export async function generateCsv(receipts: GenerateCsvInput): Promise<string> {
  return generateCsvFlow(receipts);
}

const generateCsvFlow = ai.defineFlow(
  {
    name: 'generateCsvFlow',
    // We use z.any() because the input is a complex array of objects from a trusted source (our own API).
    // Defining a full Zod schema for this is verbose and not strictly necessary for this internal flow.
    inputSchema: z.any(),
    outputSchema: z.string(),
  },
  async (receipts: GenerateCsvInput) => {
    if (!receipts || receipts.length === 0) {
      return ''; // Return an empty string if there's no data
    }

    // Define CSV headers
    const headers = [
      'ID',
      'Usuario',
      'Importe',
      'Moneda',
      'Fecha Recibo',
      'Fecha Subida',
      'Sector',
      'Estado',
      'Observaciones',
      'Motivo Aprobacion/Denegacion',
      'URL Foto',
      'Nombre Fichero',
    ];

    // Helper to escape commas and quotes in a string for CSV.
    const escapeCsvField = (field: string | number | undefined | null): string => {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        // If the string contains a comma, a quote, or a newline, wrap it in double quotes.
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            // Also, double up any existing double quotes.
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const csvRows = receipts.map(receipt => [
        escapeCsvField(receipt.id),
        escapeCsvField(receipt.usuario),
        escapeCsvField(receipt.importe.toFixed(2)),
        'EUR', // Assuming currency is always EUR
        escapeCsvField(receipt.fecha),
        escapeCsvField(new Date(receipt.fechaSubida).toLocaleString('es-ES')),
        escapeCsvField(receipt.sector),
        escapeCsvField(receipt.estado),
        escapeCsvField(receipt.observaciones),
        escapeCsvField(receipt.motivo),
        escapeCsvField(receipt.photoUrl),
        escapeCsvField(receipt.fileName),
    ].join(','));

    // Combine headers and rows
    return [headers.join(','), ...csvRows].join('\n');
  }
);
