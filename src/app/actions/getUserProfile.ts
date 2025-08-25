'use server';

import { google } from 'googleapis';
import { getWorkspaceAccessToken } from './getToken';

// Define the structure of the user profile data we want to return.
// This is based on the fields available in the Admin SDK Directory API response.
export interface UserProfile {
    primaryEmail: string;
    name: {
        givenName: string;
        familyName: string;
        fullName: string;
    };
    organizations?: Array<{
        name?: string;
        title?: string;
        department?: string;
        costCenter?: string;
        location?: string;
        primary?: boolean;
    }>;
    phones?: Array<{
        value: string;
        type: string;
    }>;
    externalIds?: Array<{
        value: string;
        type: string;
    }>
    [key: string]: any; // Allow other properties
}

/**
 * Fetches a user's profile from the Google Workspace Admin SDK.
 * This function uses a service account with domain-wide delegation.
 * 
 * @param userEmail The email address of the user to look up.
 * @returns An object containing the user's profile or an error message.
 */
export async function getUserProfile(userEmail: string): Promise<{ profile?: UserProfile, error?: string }> {
    try {
        // 1. Define the necessary scope for the Admin SDK.
        const scopes = ['https://www.googleapis.com/auth/admin.directory.user.readonly'];

        // 2. Get a Workspace-specific access token with the required scopes and delegation.
        const tokenResult = await getWorkspaceAccessToken(scopes);
        if (tokenResult.error || !tokenResult.token) {
            throw new Error(tokenResult.error || 'No se pudo obtener el token de acceso para Workspace.');
        }

        // 3. Initialize the Admin SDK client.
        const admin = google.admin({
            version: 'directory_v1',
            headers: {
                Authorization: `Bearer ${tokenResult.token}`,
            }
        });

        // 4. Call the Admin SDK API to get the user's profile.
        // projection: 'full' gets all available fields, including custom schemas.
        const res = await admin.users.get({
            userKey: userEmail,
            projection: 'full', 
            viewType: 'domain_public',
        });

        if (res.status !== 200) {
            throw new Error(`La API de Google ha devuelto un error: ${res.status} ${res.statusText}`);
        }
        
        // 5. Return the profile data.
        return { profile: res.data as UserProfile };

    } catch (error: any) {
        console.error(`Error al obtener el perfil de Workspace para ${userEmail}:`, error);

        // Provide a more helpful error message for common issues.
        let friendlyMessage = error.message;
        if (error.code === 403) {
            friendlyMessage = "Permiso denegado. Asegúrate de que la 'Delegación de todo el dominio' esté correctamente configurada en la consola de administración de Google Workspace para esta cuenta de servicio y con los scopes correctos.";
        } else if (error.code === 404) {
            friendlyMessage = `No se encontró el usuario con el email: ${userEmail}`;
        }
        
        return { error: friendlyMessage || 'Ha ocurrido un error desconocido.' };
    }
}
