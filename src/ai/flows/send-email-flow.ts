'use server';

/**
 * @fileOverview A Genkit flow for sending emails using Nodemailer.
 * This flow is designed to be called from other parts of the application to handle email notifications.
 * It uses environment variables for SMTP configuration to keep credentials secure.
 * 
 * - sendEmail - A function that handles the email sending process.
 * - SendEmailSchema - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as nodemailer from 'nodemailer';

// Define the schema for the email sending function's input.
export const SendEmailSchema = z.object({
  to: z.string().email().describe('The recipient\'s email address.'),
  subject: z.string().describe('The subject line of the email.'),
  text: z.string().describe('The plain text body of the email.'),
  html: z.string().describe('The HTML body of the email.'),
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

/**
 * A wrapper function that can be called from client components to trigger the email flow.
 * @param input The email details (to, subject, text, html).
 * @returns A promise that resolves with the result of the email sending operation.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; message: string }> {
  return sendEmailFlow(input);
}

const sendEmailFlow = ai.defineFlow(
  {
    name: 'sendEmailFlow',
    inputSchema: SendEmailSchema,
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  async (input) => {
    // Check for necessary environment variables for SMTP configuration.
    // This prevents the application from crashing if they are not set.
    const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS } = process.env;
    if (!MAIL_HOST || !MAIL_PORT || !MAIL_USER || !MAIL_PASS) {
      const errorMessage = 'La configuración del servidor de correo (SMTP) no está completa en las variables de entorno.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    // Create a transporter object using the default SMTP transport.
    // The transporter is responsible for the actual email sending.
    const transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: parseInt(MAIL_PORT, 10),
      secure: parseInt(MAIL_PORT, 10) === 465, // Use true for 465, false for other ports
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });

    try {
      // Send the email with the defined transport object and input data.
      const info = await transporter.sendMail({
        from: `"LIGAE Asepeyo" <${MAIL_USER}>`, // Sender address, shows "LIGAE Asepeyo" as name
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, message: `Email sent successfully to ${input.to}` };
    } catch (error: any) {
      console.error('Error sending email:', error);
      // Return a structured error message if sending fails.
      return { success: false, message: `Failed to send email: ${error.message}` };
    }
  }
);
