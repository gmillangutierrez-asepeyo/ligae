'use server';

/**
 * @fileOverview This file defines a Genkit flow for extracting data from receipt photos using AI.
 *
 * - extractReceiptData - A function that handles the receipt data extraction process.
 * - ExtractReceiptDataInput - The input type for the extractReceiptData function.
 * - ExtractReceiptDataOutput - The return type for the extractReceiptData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractReceiptDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

const ExtractReceiptDataOutputSchema = z.object({
  sector: z.string().describe('The type of expense (e.g., \"food\", \"transportation\").'),
  importe: z.number().describe('The total cost in euros (€), as a numerical value.'),
  usuario: z.string().describe('The email of the user who has logged in.'),
  fecha: z.string().describe('The date on the receipt.'),
});
export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  return extractReceiptDataFlow(input);
}

const extractReceiptDataPrompt = ai.definePrompt({
  name: 'extractReceiptDataPrompt',
  input: {schema: ExtractReceiptDataInputSchema},
  output: {schema: ExtractReceiptDataOutputSchema},
  prompt: `You are an expert accountant specializing in extracting data from receipts.

You will use this information to extract key information from the receipt, such as the sector, the total amount, the date, and the user.

Use the following as the primary source of information about the receipt.

Photo: {{media url=photoDataUri}}

Output the data in JSON format. Here's the schema:
{
  "sector": "string",
  "importe": number,
  "usuario": "email",
  "fecha": "string"
}
`,
});

const extractReceiptDataFlow = ai.defineFlow(
  {
    name: 'extractReceiptDataFlow',
    inputSchema: ExtractReceiptDataInputSchema,
    outputSchema: ExtractReceiptDataOutputSchema,
  },
  async input => {
    const {output} = await extractReceiptDataPrompt(input);
    return output!;
  }
);
