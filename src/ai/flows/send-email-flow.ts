'use server';

/**
 * @fileOverview A Genkit flow for sending emails using Nodemailer.
 * This flow is designed to be called from other parts of the application to handle email notifications.
 * It uses environment variables for SMTP configuration and Gravatar for sender avatar.
 *
 * - sendEmail - A function that handles the email sending process.
 * - SendEmailInput - The input type for the sendEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as nodemailer from 'nodemailer';
import md5 from 'md5';

// Define the schema for the email sending function's input.
const SendEmailSchema = z.object({
  to: z.string().email().describe('The recipient\'s email address.'),
  subject: z.string().describe('The subject line of the email.'),
  htmlBody: z.string().describe('The main HTML content of the email body.'),
  plainText: z.string().describe('The plain text version of the email for compatibility.'),
});

export type SendEmailInput = z.infer<typeof SendEmailSchema>;

/**
 * A wrapper function that can be called from client components to trigger the email flow.
 * @param input The email details (to, subject, htmlBody, plainText).
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
    const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS } = process.env;
    if (!MAIL_HOST || !MAIL_PORT || !MAIL_USER || !MAIL_PASS) {
      const errorMessage = 'La configuración del servidor de correo (SMTP) no está completa en las variables de entorno.';
      console.error(errorMessage);
      return { success: false, message: errorMessage };
    }

    const transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: parseInt(MAIL_PORT, 10),
      secure: parseInt(MAIL_PORT, 10) === 465,
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });

    const senderEmail = MAIL_USER.trim().toLowerCase();
    const gravatarHash = md5(senderEmail);
    const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?s=64&d=mp`;

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${input.subject}</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 0; padding: 0; background-color: #f8fafc; }
              .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.5rem; overflow: hidden; }
              .header { background-color: #29ABE2; color: #ffffff; padding: 24px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
              .header p { margin: 4px 0 0; font-size: 16px; opacity: 0.9; }
              .content { padding: 32px; color: #334155; line-height: 1.6; }
              .content p { margin: 0 0 16px; }
              .content a { color: #29ABE2; text-decoration: none; font-weight: 500; }
              .footer { padding: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; display: flex; align-items: center; }
              .footer img { border-radius: 50%; margin-right: 12px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>LIGAE Asepeyo</h1>
                  <p>Gestión de Notas de Gastos</p>
              </div>
              <div class="content">
                  ${input.htmlBody}
              </div>
              <div class="footer">
                  <img src="${gravatarUrl}" alt="Avatar" width="40" height="40">
                  <div>
                      <strong>Enviado desde LIGAE Asepeyo</strong><br>
                      Este es un correo electrónico generado automáticamente. Por favor, no responda a este mensaje.
                  </div>
              </div>
          </div>
      </body>
      </html>
    `;

    try {
      const info = await transporter.sendMail({
        from: `"LIGAE Asepeyo" <${MAIL_USER}>`,
        to: input.to,
        subject: input.subject,
        text: input.plainText,
        html: fullHtml,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, message: `Email sent successfully to ${input.to}` };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return { success: false, message: `Failed to send email: ${error.message}` };
    }
  }
);
