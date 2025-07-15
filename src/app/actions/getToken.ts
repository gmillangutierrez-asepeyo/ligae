'use server';

import { GoogleAuth } from 'google-auth-library';

/**
 * Generates a short-lived OAuth2 access token using a service account.
 * The service account key is stored securely in an environment variable.
 */
export async function getAccessToken(): Promise<{ token?: string, error?: string }> {
    try {
        const serviceAccountJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (!serviceAccountJsonString) {
            throw new Error('La variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON no está definida.');
        }

        let serviceAccountCredentials;
        try {
             serviceAccountCredentials = JSON.parse(serviceAccountJsonString);
             // The private key from the .env file has its newlines escaped.
             // We need to un-escape them for the crypto library to parse the PEM key correctly.
             serviceAccountCredentials.private_key = serviceAccountCredentials.private_key.replace(/\\n/g, '\n');
        } catch (e) {
            console.error("Fallo al interpretar el JSON de la cuenta de servicio:", e);
            throw new Error('Fallo al interpretar GOOGLE_SERVICE_ACCOUNT_JSON. Asegúrate de que es una cadena JSON válida y que la clave privada está correctamente formateada.');
        }

        const auth = new GoogleAuth({
            credentials: serviceAccountCredentials,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
             throw new Error('Fallo al obtener el token de acceso de Google. Revisa las credenciales de la cuenta de servicio.');
        }

        return { token: accessToken.token };
    } catch (error: any) {
        console.error('Error generando el token de acceso:', error);
        // Return a structured error to the client
        return { error: error.message || 'Ha ocurrido un error desconocido en el servidor al generar el token.' };
    }
}
