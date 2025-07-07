'use client';

import React from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';

function SettingsPage() {
  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Settings</CardTitle>
              <CardDescription>
                Manage your application settings here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
                <ShieldCheck className="mx-auto h-16 w-16 text-green-500" />
                <h3 className="text-lg font-semibold">Authentication is Secure</h3>
                <p className="text-sm text-muted-foreground">
                    This application is configured to securely access Google Cloud services.
                    Token management is handled automatically on the server. No action is required from you.
                </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
