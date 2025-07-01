import React, { useState } from 'react';
import { Building2, Store, Key, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/contexts/OrganizationContext';
import axios from 'axios';
import { toast } from 'sonner';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { currentOrganization } = useOrganization();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // WooCommerce credentials
  const [wcUrl, setWcUrl] = useState('');
  const [wcKey, setWcKey] = useState('');
  const [wcSecret, setWcSecret] = useState('');
  
  // Gemini credentials
  const [geminiKey, setGeminiKey] = useState('');

  const handleWooCommerceSetup = async () => {
    if (!wcUrl || !wcKey || !wcSecret) {
      toast.error('Please fill in all WooCommerce fields');
      return;
    }

    try {
      setLoading(true);
      
      // Save WooCommerce credentials
      await axios.post('/api/credentials', {
        service: 'woocommerce',
        name: 'default',
        credentials: {
          apiUrl: wcUrl.replace(/\/$/, ''), // Remove trailing slash
          consumerKey: wcKey,
          consumerSecret: wcSecret,
        },
      });

      // Test connection
      const testResponse = await axios.post('/api/credentials/test/woocommerce');
      
      if (testResponse.data.success) {
        toast.success(`Connected to ${testResponse.data.storeInfo.name}`);
        setStep(2);
      } else {
        toast.error('Failed to connect to WooCommerce');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGeminiSetup = async () => {
    if (!geminiKey) {
      toast.error('Please enter your Gemini API key');
      return;
    }

    try {
      setLoading(true);
      
      // Save Gemini credentials
      await axios.post('/api/credentials', {
        service: 'gemini',
        name: 'default',
        credentials: {
          apiKey: geminiKey,
        },
      });

      toast.success('AI service configured successfully');
      onComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save AI credentials');
    } finally {
      setLoading(false);
    }
  };

  const skipGemini = () => {
    toast.info('You can configure AI features later in settings');
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome to {currentOrganization?.name}</h1>
        <p className="text-muted-foreground">Let's get your store connected</p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {step > 1 ? <CheckCircle className="w-6 h-6" /> : <Store className="w-6 h-6" />}
          </div>
          <span className="ml-3 font-medium">Connect WooCommerce</span>
        </div>
        <div className="flex-1 mx-4 h-0.5 bg-muted">
          <div className={cn(
            "h-full bg-primary transition-all duration-300",
            step > 1 ? "w-full" : "w-0"
          )} />
        </div>
        <div className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
          )}>
            {step > 2 ? <CheckCircle className="w-6 h-6" /> : <Key className="w-6 h-6" />}
          </div>
          <span className="ml-3 font-medium">Configure AI (Optional)</span>
        </div>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Connect Your WooCommerce Store</CardTitle>
            <CardDescription>
              Enter your WooCommerce REST API credentials. You can find these in your WordPress admin under WooCommerce → Settings → Advanced → REST API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wcUrl">Store URL</Label>
              <Input
                id="wcUrl"
                placeholder="https://mystore.com"
                value={wcUrl}
                onChange={(e) => setWcUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">Your WordPress site URL</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wcKey">Consumer Key</Label>
              <Input
                id="wcKey"
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={wcKey}
                onChange={(e) => setWcKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wcSecret">Consumer Secret</Label>
              <Input
                id="wcSecret"
                type="password"
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={wcSecret}
                onChange={(e) => setWcSecret(e.target.value)}
              />
            </div>
            <Button
              onClick={handleWooCommerceSetup}
              disabled={loading || !wcUrl || !wcKey || !wcSecret}
              className="w-full"
            >
              {loading ? 'Connecting...' : 'Connect Store'}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure AI Content Generation (Optional)</CardTitle>
            <CardDescription>
              Add your Google Gemini API key to enable AI-powered product descriptions and SEO optimization. You can skip this step and configure it later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="geminiKey">Gemini API Key</Label>
              <Input
                id="geminiKey"
                type="password"
                placeholder="AIzaSy..."
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google AI Studio</a>
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={skipGemini}
                disabled={loading}
                className="flex-1"
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleGeminiSetup}
                disabled={loading || !geminiKey}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Configure AI'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}