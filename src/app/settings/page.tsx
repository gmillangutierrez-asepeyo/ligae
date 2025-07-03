'use client';

import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function SettingsPage() {
  const [tokenStatus, setTokenStatus] = useState<'checking' | 'active' | 'inactive'>('checking');

  useEffect(() => {
    const currentToken = localStorage.getItem('oauth_token');
    if (currentToken) {
      setTokenStatus('active');
    } else {
      setTokenStatus('inactive');
    }
  }, []);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Settings</CardTitle>
              <CardDescription>
                Manage your application settings here. The OAuth 2.0 token is now managed automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">API Access Token</h3>
                  <p className="text-sm text-muted-foreground">
                    This token is generated automatically upon login to authenticate with Google Cloud APIs.
                  </p>
                </div>
                {tokenStatus === 'active' && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Active
                  </Badge>
                )}
                {tokenStatus === 'inactive' && (
                  <Badge variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" />
                    Inactive
                  </Badge>
                )}
                 {tokenStatus === 'checking' && (
                  <Badge variant="outline">
                    Checking...
                  </Badge>
                )}
              </div>
               <p className="text-sm text-muted-foreground mt-2">
                  If the token is inactive, please try signing out and signing back in.
                </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
