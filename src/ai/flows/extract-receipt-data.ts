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
  usuario: z.string().email().describe("The email of the user submitting the receipt."),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

const validSectors = z.enum(["comida", "transporte", "otros"]);

const ExtractReceiptDataOutputSchema = z.object({
  sector: validSectors.describe('The type of expense. Must be one of: "comida", "transporte", or "otros".'),
  importe: z.number().describe('The total cost in euros (€), as a numerical value.'),
  usuario: z.string().describe('The email of the user who has logged in.'),
  fecha: z.string().describe('The date on the receipt.'),
});
export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

// This is the internal schema for what we expect from the AI model.
// We'll allow any string for sector from the model, and then validate it.
const ModelOutputSchema = z.object({
  sector: z.string().describe('The type of expense. Must be one of: "comida", "transporte", or "otros".'),
  importe: z.number().describe('The total cost in euros (€), as a numerical value.'),
  fecha: z.string().describe('The date on the receipt.'),
});


export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  return extractReceiptDataFlow(input);
}

const extractReceiptDataPrompt = ai.definePrompt({
  name: 'extractReceiptDataPrompt',
  input: {schema: ExtractReceiptDataInputSchema.pick({ photoDataUri: true })},
  output: {schema: ModelOutputSchema},
  prompt: `You are an expert accountant specializing in extracting data from receipts.

You will use this information to extract key information from the receipt.
- Analyze the receipt to determine the expense category. It must be one of the following: "comida", "transporte", or "otros". If you cannot confidently determine the category from the image, you MUST classify it as "otros".
- Extract the total amount and the date.

Use the following as the primary source of information about the receipt.

Photo: {{media url=photoDataUri}}

Output the data in JSON format according to the provided schema.
`,
});

const extractReceiptDataFlow = ai.defineFlow(
  {
    name: 'extractReceiptDataFlow',
    inputSchema: ExtractReceiptDataInputSchema,
    outputSchema: ExtractReceiptDataOutputSchema,
  },
  async (input) => {
    const {output: modelOutput} = await extractReceiptDataPrompt({ photoDataUri: input.photoDataUri });

    if (!modelOutput) {
        throw new Error("Failed to get a valid response from the AI model.");
    }
    
    const parsedSector = validSectors.safeParse(modelOutput.sector);
    const finalSector = parsedSector.success ? parsedSector.data : 'otros';

    return {
      ...modelOutput,
      sector: finalSector,
      usuario: input.usuario,
    };
  }
);
