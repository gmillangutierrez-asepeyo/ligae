import { NextRequest, NextResponse } from 'next/server';
import { Impersonated } from 'google-auth-library';

const TARGET_SERVICE_ACCOUNT = 'ligae-web-client@ligae-asepeyo-463510.iam.gserviceaccount.com';
const SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/firebase.database',
    'https://www.googleapis.com/auth/userinfo.email'
];

export async function POST(req: NextRequest) {
    try {
        // In a real-world high-security scenario, you would verify the
        // incoming idToken to ensure it's from a valid, authenticated user.
        // For this internal app, we trust calls to this endpoint are legitimate.
        const body = await req.json();
        if (!body.idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }

        // This uses Application Default Credentials of the App Hosting environment
        // to impersonate the target service account. The environment's service
        // account must have the "Service Account Token Creator" role on the target.
        const auth = new Impersonated({
            targetPrincipal: TARGET_SERVICE_ACCOUNT,
            targetScopes: SCOPES,
            lifetime: 3600, // Token is valid for 1 hour
        });

        const { token } = await auth.getAccessToken();

        if (!token) {
            throw new Error('Failed to generate access token.');
        }

        return NextResponse.json({ accessToken: token });

    } catch (error: any) {
        console.error('Error generating impersonated token:', error);
        return NextResponse.json({ error: 'Failed to generate token', details: error.message }, { status: 500 });
    }
}
