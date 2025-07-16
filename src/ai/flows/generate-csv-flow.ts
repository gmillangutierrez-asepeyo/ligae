
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

    /**
     * Escapes a field for CSV format. If the field contains a comma, double quote, or newline,
     * it will be enclosed in double quotes. Existing double quotes within the field will be escaped
     * by doubling them (e.g., " becomes "").
     * @param field The data to escape.
     * @returns A CSV-safe string.
     */
    const escapeCsvField = (field: string | number | undefined | null): string => {
        if (field === null || field === undefined) {
            return '';
        }
        const str = String(field);
        // Check if the string needs to be quoted
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            // Escape any double quotes inside the string by replacing them with two double quotes
            const escapedStr = str.replace(/"/g, '""');
            return `"${escapedStr}"`;
        }
        return str;
    };

    /**
     * Formats a date string or timestamp into a consistent 'YYYY-MM-DD HH:mm:ss' format.
     * @param dateInput The date string or timestamp from Firestore.
     * @returns A formatted date string.
     */
    const formatUploadDate = (dateInput: string | number): string => {
        try {
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) {
                return ''; // Invalid date
            }
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        } catch {
            return ''; // Return empty if parsing fails
        }
    };
    
    const csvRows = receipts.map(receipt => [
        escapeCsvField(receipt.id),
        escapeCsvField(receipt.usuario),
        // Use dot as decimal separator consistently.
        escapeCsvField(receipt.importe.toFixed(2)), 
        escapeCsvField('EUR'),
        escapeCsvField(receipt.fecha), // Already in YYYY-MM-DD
        escapeCsvField(formatUploadDate(receipt.fechaSubida)),
        escapeCsvField(receipt.sector),
        escapeCsvField(receipt.estado),
        escapeCsvField(receipt.observaciones),
        escapeCsvField(receipt.motivo),
        escapeCsvField(receipt.photoUrl),
        escapeCsvField(receipt.fileName),
    ].join(','));

    // Combine headers and rows, separated by newlines
    return [headers.join(','), ...csvRows].join('\n');
  }
);
