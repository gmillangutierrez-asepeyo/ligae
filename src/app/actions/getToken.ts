'use server';

import { JWT } from 'google-auth-library';

// --- CONFIGURACIÓN ---
// El email de un administrador de Google Workspace.
// La cuenta de servicio actuará "en nombre de" este usuario para acceder a la API de Admin.
const ADMIN_USER_EMAIL = 'gmillangutierrez@asepeyo.es';


/**
 * Generates a short-lived OAuth2 access token for standard Google Cloud APIs
 * like Firestore and Cloud Storage, using the service account credentials.
 */
export async function getAccessToken(): Promise<{ token?: string; error?: string }> {
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

        const auth = new JWT({
            email: serviceAccountCredentials.client_email,
            key: serviceAccountCredentials.private_key,
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });

        const accessToken = await auth.getAccessToken();
        
        if (!accessToken.token) {
             throw new Error('Fallo al obtener el token de acceso de Google. Revisa las credenciales de la cuenta de servicio.');
        }

        return { token: accessToken.token };
    } catch (error: any) {
        console.error('Error generando el token de acceso:', error);
        return { error: error.message || 'Ha ocurrido un error desconocido en el servidor al generar el token.' };
    }
}

/**
 * Generates a short-lived OAuth2 access token specifically for the Google Workspace Admin SDK,
 * using domain-wide delegation to impersonate an admin user.
 * 
 * @param scopes - An array of scope strings required for the token.
 */
export async function getWorkspaceAccessToken(scopes: string[]): Promise<{ token?: string, error?: string }> {
    try {
        const serviceAccountJsonString = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (!serviceAccountJsonString) {
            throw new Error('La variable de entorno GOOGLE_SERVICE_ACCOUNT_JSON no está definida.');
        }

        let serviceAccountCredentials;
        try {
             serviceAccountCredentials = JSON.parse(serviceAccountJsonString);
             serviceAccountCredentials.private_key = serviceAccountCredentials.private_key.replace(/\\n/g, '\n');
        } catch (e) {
            console.error("Fallo al interpretar el JSON de la cuenta de servicio:", e);
            throw new Error('Fallo al interpretar GOOGLE_SERVICE_ACCOUNT_JSON. Asegúrate de que es una cadena JSON válida y que la clave privada está correctamente formateada.');
        }

        const auth = new JWT({
            email: serviceAccountCredentials.client_email,
            key: serviceAccountCredentials.private_key,
            scopes: scopes,
            // This is the key part for domain-wide delegation.
            // The service account impersonates this user to access the Admin SDK.
            subject: ADMIN_USER_EMAIL,
        });

        const accessToken = await auth.getAccessToken();
        
        if (!accessToken.token) {
             throw new Error('Fallo al obtener el token de acceso de Workspace. Revisa las credenciales y la configuración de delegación de dominio en Google Workspace.');
        }

        return { token: accessToken.token };
    } catch (error: any) {
        console.error('Error generando el token de acceso de Workspace:', error);
        return { error: error.message || 'Ha ocurrido un error desconocido en el servidor al generar el token de Workspace.' };
    }
}
