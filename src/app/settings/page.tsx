'use client';

import React, { useState, useEffect } from 'react';
import AuthGuard from '@/components/auth-guard';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useToken } from '@/contexts/token-context';
import { Save, KeyRound, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

function SettingsPage() {
  const { token, setToken } = useToken();
  const [currentToken, setCurrentToken] = useState(token || '');
  const { toast } = useToast();

  useEffect(() => {
    // Sync local state if token changes from context (e.g. on logout)
    setCurrentToken(token || '');
  }, [token]);

  const handleSave = () => {
    setToken(currentToken);
    toast({
      title: 'Token Saved',
      description: 'Your OAuth 2.0 token has been saved locally.',
    });
  };

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 flex items-center justify-center">
          <Card className="w-full max-w-2xl">
            <CardHeader>
                <div className="flex items-center gap-4">
                    <KeyRound className="h-10 w-10 text-primary" />
                    <div>
                        <CardTitle className="font-headline text-2xl">API Access Token</CardTitle>
                        <CardDescription>
                            Provide an OAuth 2.0 access token to use the application.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>How to get a token</AlertTitle>
                <AlertDescription>
                  You can get a temporary access token from the Google Cloud Shell by running the command: 
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold ml-1">
                    gcloud auth print-access-token
                  </code>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="token-input">Google Cloud OAuth 2.0 Token</Label>
                <Input
                  id="token-input"
                  type="password"
                  placeholder="Paste your temporary token here"
                  value={currentToken}
                  onChange={(e) => setCurrentToken(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!currentToken}>
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
