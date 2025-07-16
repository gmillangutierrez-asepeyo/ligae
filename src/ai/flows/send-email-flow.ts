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
  text: z.string().describe('The plain text body of the email.'),
  html: z.string().describe('The HTML body of the email. Can contain {{EMAIL_FOOTER}} placeholder.'),
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

    // --- Gravatar Integration ---
    const senderEmail = MAIL_USER.trim().toLowerCase();
    const gravatarHash = md5(senderEmail);
    const gravatarUrl = `https://www.gravatar.com/avatar/${gravatarHash}?s=64&d=mp`;

    const emailFooter = `
      <table style="margin-top: 24px; border-top: 1px solid #e2e8f0; width: 100%;">
        <tr>
          <td style="padding-top: 16px; display: flex; align-items: center;">
            <img src="${gravatarUrl}" alt="Avatar del remitente" width="40" height="40" style="border-radius: 50%; margin-right: 12px;">
            <div style="font-family: sans-serif; font-size: 12px; color: #64748b;">
              <strong>LIGAE Asepeyo</strong><br>
              Este es un correo electrónico automatizado.
            </div>
          </td>
        </tr>
      </table>
    `;

    const finalHtml = input.html.includes('{{EMAIL_FOOTER}}')
      ? input.html.replace('{{EMAIL_FOOTER}}', emailFooter)
      : input.html + emailFooter;


    try {
      const info = await transporter.sendMail({
        from: `"LIGAE Asepeyo" <${MAIL_USER}>`,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: finalHtml,
      });

      console.log('Message sent: %s', info.messageId);
      return { success: true, message: `Email sent successfully to ${input.to}` };
    } catch (error: any) {
      console.error('Error sending email:', error);
      return { success: false, message: `Failed to send email: ${error.message}` };
    }
  }
);
