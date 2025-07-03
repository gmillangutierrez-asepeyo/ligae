// This API route for automatic token generation has been disabled.
// The OAuth 2.0 token is now managed manually via the Settings page.

import { NextResponse } from 'next/server';

// Return a 404 error if this endpoint is ever called.
export async function POST() {
    return NextResponse.json(
        { error: 'This endpoint is no longer in use.' },
        { status: 404 }
    );
}
