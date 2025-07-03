'use server';
/**
 * @fileOverview A Genkit flow to crop a receipt image.
 *
 * - cropReceiptImage - A function that crops the receipt from a photo.
 * - CropReceiptImageInput - The input type for the cropReceiptImage function.
 * - CropReceiptImageOutput - The return type for the cropReceiptImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CropReceiptImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo containing a receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type CropReceiptImageInput = z.infer<typeof CropReceiptImageInputSchema>;

const CropReceiptImageOutputSchema = z.object({
    croppedPhotoDataUri: z.string().describe("The cropped receipt photo as a data URI.")
});
export type CropReceiptImageOutput = z.infer<typeof CropReceiptImageOutputSchema>;

export async function cropReceiptImage(input: CropReceiptImageInput): Promise<CropReceiptImageOutput> {
  return cropReceiptImageFlow(input);
}

const cropReceiptImageFlow = ai.defineFlow(
  {
    name: 'cropReceiptImageFlow',
    inputSchema: CropReceiptImageInputSchema,
    outputSchema: CropReceiptImageOutputSchema,
  },
  async (input) => {
    try {
      const { media } = await ai.generate({
          model: 'googleai/gemini-2.0-flash-preview-image-generation',
          prompt: [
              { media: { url: input.photoDataUri } },
              { text: 'Analyze the provided image. Identify the receipt within the image. Return a new image that is tightly cropped to show only the receipt, removing any surrounding background. The receipt should be straightened and oriented correctly if it is skewed. Do not add any text or other artifacts to the image.' },
          ],
          config: {
              responseModalities: ['TEXT', 'IMAGE'],
          },
      });

      // If cropping fails or no image is returned, fall back to the original image
      if (!media?.url) {
          console.warn('Image cropping returned no image, falling back to original image.');
          return { croppedPhotoDataUri: input.photoDataUri };
      }
      
      return { croppedPhotoDataUri: media.url };
    } catch (error) {
      console.error('Error during image cropping flow, falling back to original image:', error);
      return { croppedPhotoDataUri: input.photoDataUri };
    }
  }
);
