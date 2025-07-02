'use client';

import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save } from 'lucide-react';

function SettingsPage() {
  const [token, setToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const currentToken = localStorage.getItem('oauth_token') || '';
    setToken(currentToken);
  }, []);

  const handleSave = () => {
    localStorage.setItem('oauth_token', token);
    toast({
      title: 'Token Saved',
      description: 'Your OAuth 2.0 token has been saved successfully.',
    });
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">Settings</CardTitle>
              <CardDescription>
                Manage your application settings here. The OAuth 2.0 token is required for uploading receipts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="token" className="text-lg">OAuth 2.0 Token</Label>
                <Input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste your token here"
                  className="mt-2"
                />
                 <p className="text-sm text-muted-foreground mt-2">
                  This token is used to authenticate with Google Cloud Storage and Firestore APIs. It is stored locally in your browser and never sent to our servers except for API calls to Google.
                </p>
              </div>
              <Button onClick={handleSave}>
                <Save className="mr-2 h-4 w-4" />
                Save Token
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
