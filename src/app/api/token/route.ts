import { NextRequest, NextResponse } from 'next/server';
import { GoogleAuth, Impersonated } from 'google-auth-library';

const TARGET_SERVICE_ACCOUNT = 'ligae-web-client@ligae-asepeyo-463510.iam.gserviceaccount.com';
const TARGET_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/firebase.database',
    'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * This endpoint is the server-side equivalent of running the command:
 * `gcloud auth print-access-token --impersonate-service-account=...`
 * 
 * It uses the Google Auth Library to perform service account impersonation,
 * leveraging the Firebase App Hosting environment's own service account credentials
 * via Application Default Credentials (ADC).
 * This is the standard and secure method for server-to-server authentication flows.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        if (!body.idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }
        
        // The source client (the App Hosting service account) only needs permissions
        // to call the IAM Credentials API to impersonate another service account.
        // We initialize it with the minimal required scope to avoid permission errors.
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/iam',
        });
        const sourceClient = await auth.getClient();

        const impersonated = new Impersonated({
            sourceClient,
            targetPrincipal: TARGET_SERVICE_ACCOUNT,
            lifetime: 3600,
            delegates: [],
            targetScopes: TARGET_SCOPES, // These are the scopes for the *final* token.
        });

        const tokenResponse = await impersonated.getAccessToken();
        const token = tokenResponse.token;

        if (!token) {
            throw new Error('Failed to generate access token.');
        }

        return NextResponse.json({ accessToken: token });

    } catch (error: any) {
        console.error('Error generating impersonated token:', error);
        
        const details = error.message.includes('Could not find Application Default Credentials') 
            ? 'Could not find Application Default Credentials. For local development, please configure them by running `gcloud auth application-default login` in your terminal.'
            : error.message;
            
        return NextResponse.json({ error: 'Failed to generate token', details: details }, { status: 500 });
    }
}
