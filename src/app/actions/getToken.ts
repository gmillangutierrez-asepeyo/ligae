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
            throw new Error('The GOOGLE_SERVICE_ACCOUNT_JSON environment variable is not set.');
        }

        let serviceAccountCredentials;
        try {
             serviceAccountCredentials = JSON.parse(serviceAccountJsonString);
        } catch (e) {
            console.error("Failed to parse service account JSON.");
            throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Please ensure it is a valid JSON string.');
        }

        const auth = new GoogleAuth({
            credentials: serviceAccountCredentials,
            scopes: 'https://www.googleapis.com/auth/cloud-platform',
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
             throw new Error('Failed to retrieve access token from Google.');
        }

        return { token: accessToken.token };
    } catch (error: any) {
        console.error('Error generating access token:', error);
        // Return a structured error to the client
        return { error: error.message || 'An unknown server error occurred.' };
    }
}
