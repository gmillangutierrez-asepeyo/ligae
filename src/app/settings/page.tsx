'use client';

import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

function SettingsPage() {
  const { toast } = useToast();
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('oauth_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  const handleSaveToken = () => {
    if (!token.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Token cannot be empty.',
      });
      return;
    }
    localStorage.setItem('oauth_token', token);
    toast({
      title: 'Success',
      description: 'OAuth token saved successfully.',
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
                Manage your application settings here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oauth-token">Google Cloud OAuth2 Token</Label>
                <p className="text-sm text-muted-foreground">
                  Generate a token using {' '}
                  <code className="bg-muted px-1 py-0.5 rounded">
                    gcloud auth print-access-token
                  </code>{' '}
                  and paste it here.
                </p>
                <Textarea
                  id="oauth-token"
                  placeholder="Paste your token here..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  rows={5}
                />
              </div>
              <Button onClick={handleSaveToken}>Save Token</Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  );
}

export default SettingsPage;
