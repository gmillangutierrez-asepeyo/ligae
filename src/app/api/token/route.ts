import { NextResponse } from 'next/server';
import { GoogleAuth } from 'google-auth-library';
import type { JSONClient } from 'google-auth-library/build/src/auth/googleauth';

export async function POST() {
    try {
        const serviceAccountKeyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

        if (!serviceAccountKeyJson) {
            throw new Error('The GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set.');
        }

        // The service account key is stored as a stringified JSON in the environment variable.
        const credentials = JSON.parse(serviceAccountKeyJson);

        const auth = new GoogleAuth({
            credentials,
            scopes: [
                'https://www.googleapis.com/auth/cloud-platform',
                'https://www.googleapis.com/auth/datastore',
                'https://www.googleapis.com/auth/devstorage.read_write',
            ],
        });

        const client = await auth.getClient() as JSONClient;
        const accessToken = await client.getAccessToken();

        if (!accessToken.token) {
             return NextResponse.json({ error: 'Failed to generate access token.' }, { status: 500 });
        }

        return NextResponse.json({ token: accessToken.token });

    } catch (error: any) {
        console.error('API Token Generation Error:', error);
        return NextResponse.json(
            { error: 'Token generation failed: ' + error.message },
            { status: 500 }
        );
    }
}
