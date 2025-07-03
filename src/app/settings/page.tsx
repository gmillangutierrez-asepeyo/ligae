'use client';

import React from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">API Access</h3>
                  <p className="text-sm text-muted-foreground">
                    This application now uses Server Actions to securely communicate with Google Cloud APIs. No manual token configuration is needed.
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Automatic
                </Badge>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
