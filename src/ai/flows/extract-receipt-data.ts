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

// Helper function to get date in YYYY-MM-DD format, robust for server environments.
function getSafeDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const ExtractReceiptDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'Una foto de un recibo, como un data URI que debe incluir un tipo MIME y usar codificación Base64. Formato esperado: \'data:<mimetype>;base64,<encoded_data>\'.'
    ),
  usuario: z.string().email().describe('El email del usuario que envía el recibo.'),
});
export type ExtractReceiptDataInput = z.infer<typeof ExtractReceiptDataInputSchema>;

const validSectors = z.enum(["comida", "transporte", "otros"]);

const ExtractReceiptDataOutputSchema = z.object({
  sector: validSectors.describe('El tipo de gasto. Debe ser uno de: "comida", "transporte" u "otros".'),
  importe: z.number().describe('El coste total en euros (€), como valor numérico.'),
  usuario: z.string().describe('El email del usuario que ha iniciado sesión.'),
  fecha: z.string().describe('La fecha del recibo.'),
});
export type ExtractReceiptDataOutput = z.infer<typeof ExtractReceiptDataOutputSchema>;

// This is the internal schema for what we expect from the AI model.
// Use the enum for sector to enforce the correct output from the model.
// Allow string or number for importe to handle variations from the model.
const ModelOutputSchema = z.object({
  sector: validSectors.describe('El tipo de gasto. DEBE ser uno de: "comida", "transporte" u "otros". En caso de duda, DEBES usar "otros".'),
  importe: z.union([z.string(), z.number()]).optional().describe('El coste total en euros (€), como valor numérico o una cadena de texto que lo represente.'),
  fecha: z.string().optional().describe('La fecha del recibo en formato YYYY-MM-DD.'),
});


export async function extractReceiptData(input: ExtractReceiptDataInput): Promise<ExtractReceiptDataOutput> {
  return extractReceiptDataFlow(input);
}

const extractReceiptDataPrompt = ai.definePrompt({
  name: 'extractReceiptDataPrompt',
  input: {schema: ExtractReceiptDataInputSchema.pick({ photoDataUri: true })},
  output: {schema: ModelOutputSchema},
  prompt: `Eres un contable experto especializado en extraer datos de recibos.

Utilizarás esta información para extraer los datos clave del recibo.
- Analiza el recibo para determinar la categoría del gasto. Debe ser una de las siguientes: "comida", "transporte", u "otros". Si no puedes determinar la categoría con seguridad a partir de la imagen, DEBES clasificarla como "otros".
- Extrae el importe total y la fecha.
- IMPORTANTE: Las fechas en los recibos probablemente estarán en formato español (Día/Mes/Año). Asegúrate de interpretar la fecha correctamente antes de convertirla al formato YYYY-MM-DD.

Utiliza lo siguiente como fuente principal de información sobre el recibo.

Foto: {{media url=photoDataUri}}

Devuelve los datos en formato JSON según el esquema proporcionado.
`,
});

const extractReceiptDataFlow = ai.defineFlow(
  {
    name: 'extractReceiptDataFlow',
    inputSchema: ExtractReceiptDataInputSchema,
    outputSchema: ExtractReceiptDataOutputSchema,
  },
  async (input) => {
    // Start with default values to ensure a valid object is always returned.
    const finalOutput: ExtractReceiptDataOutput = {
      sector: 'otros',
      importe: 0,
      usuario: input.usuario,
      fecha: getSafeDateString(),
    };

    try {
      const {output: modelOutput} = await extractReceiptDataPrompt({ photoDataUri: input.photoDataUri });

      // If the model provides a valid output, overwrite the defaults.
      // Genkit's Zod parsing guarantees that if modelOutput is not null/undefined, it matches ModelOutputSchema.
      if (modelOutput) {
        finalOutput.sector = modelOutput.sector; // This is guaranteed to be a valid enum value.
        
        // Ensure the date is a non-empty string, otherwise use today's date.
        // The model might return an empty or invalid string if no date is found.
        finalOutput.fecha = (modelOutput.fecha && modelOutput.fecha.trim()) ? modelOutput.fecha : getSafeDateString();

        if (modelOutput.importe) {
          const importeAsString = String(modelOutput.importe).replace(',', '.');
          const parsedImporte = parseFloat(importeAsString);
          if (!isNaN(parsedImporte)) {
            finalOutput.importe = parsedImporte;
          }
        }
      } else {
        console.warn("El modelo de IA no devolvió datos estructurados válidos. Usando valores por defecto.");
      }
    } catch (error) {
      console.error("Ocurrió un error en extractReceiptDataFlow, usando valores por defecto:", error);
      // In case of any error (e.g., API failure, safety filters), the default finalOutput is used.
    }

    return finalOutput;
  }
);
