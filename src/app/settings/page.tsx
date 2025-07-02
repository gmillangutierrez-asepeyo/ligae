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

const PRECONFIGURED_TOKEN = 'ya29.c.c0ASRK0GYzefqn0GWlHiQ5fscAX6F29rIr9xExPy_DUPzg52zaG58eGLB3atEUsAc8Wp6wMNOaWPoi36r4tV8cLUOSi-NaQffMzwpOEUNsUnLyBvWRDwXqOxwuT8h1P6NoO4nWPn9h2fUXh9k6aaiMAOhpK8e4qOakIeGvbMb9mZMSt3G05RBraDFm2ylJ9198kz3VEaw83ciCwtKQ2hS-QfyagEEyXj2FiOsP91bs4vL51pQtmDf-oZQzPdq17XH-eOn7REbBRJuDPDFmMesZZdA-Gz8ALk-kjZvl8KXexRBLw0Rns96RCQThpNNVBll_xAZuKYwNKpXapkZmCkuRK5ci9dBt2m2sWLQ0Rz5s06nISeVfTArdELsLgS8hStPa8Sy8fPZfu99USW6e3ZTX8Gm5gsegu1FXk60wbmwvRLCXDK8RSLbOdiq86qobJO6IcOmaEKUcyQQHl1A38z2nh-gh2GYZKNoZKw9OMzyzOQwBNZsbciobaGL1Jax2clEV1WtEp4lKiBT8wSAykcTtmymzV7rnwb5_ur2sPMs7yRb_je-TymnXS1-pauAy9IepxGTyvf6mpGCYkISWFntw4ELdaaHTVwvG76ZFSNoe0q_Nt2axgWuBMaLIE641Ag1sm-b-x17n2y06k_8i9dQQge2Rkrpe2SqypnvgX8idQde5wOWwWgJdlMgj-3SgVFoV0WqcFrSi_4Oyc20kBfnZ_nsd5RXZoFMRjRR4Ju0veM5MmaOxjB6ZuJkpYsqR-B397zqSrIO0FSQI7m6r1ll65k5b0BfWvlqWsOO493JJfnpclg_amVM_e0BkBz6ZaIR8U8-rfmBYV7vRpMF7_cXg8t0sd7gRgjoz7inwWbsV7jd0zv_R9tW-B_Vm30UBQBJZe0ztsWdwqlUuv1agadjU5yeB1aB1gh0o-b_ZVk2bxBYVq4Mq1ijzdz8qU_v3I3Xx5nUFkB9RttoR4I6kinyO3Olmu5h2c0xZfQfI0F7cSzr8X84qyjJMrqI';

function SettingsPage() {
  const [token, setToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    let currentToken = localStorage.getItem('oauth_token');
    if (!currentToken) {
      currentToken = PRECONFIGURED_TOKEN;
      localStorage.setItem('oauth_token', currentToken);
    }
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
