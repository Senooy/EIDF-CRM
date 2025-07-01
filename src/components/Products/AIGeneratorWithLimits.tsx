import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { cn } from '@/lib/utils';

interface AIGeneratorWithLimitsProps {
  onGenerate: () => Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}

export function AIGeneratorWithLimits({ 
  onGenerate, 
  disabled = false,
  children 
}: AIGeneratorWithLimitsProps) {
  const { limits, checkLimit, recordUsage, getUsagePercentage, isNearLimit } = useUsageLimits();
  const [checking, setChecking] = React.useState(false);

  const handleGenerate = async () => {
    setChecking(true);
    try {
      // Check if we can generate
      const canGenerate = await checkLimit('ai_generations');
      
      if (!canGenerate) {
        return;
      }

      // Proceed with generation
      await onGenerate();
      
      // Record the usage
      await recordUsage('ai_generations', 1);
    } finally {
      setChecking(false);
    }
  };

  const aiLimit = limits.ai_generations;
  const percentage = getUsagePercentage('ai_generations');
  const nearLimit = isNearLimit('ai_generations', 80);
  const atLimit = percentage >= 100;

  React.useEffect(() => {
    // Check limit on component mount
    checkLimit('ai_generations');
  }, [checkLimit]);

  return (
    <div className="space-y-4">
      {aiLimit && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Générations IA ce mois
            </span>
            <span className={cn(
              "font-medium",
              atLimit && "text-destructive",
              nearLimit && !atLimit && "text-yellow-600"
            )}>
              {aiLimit.current} / {aiLimit.limit === 99999 ? '∞' : aiLimit.limit}
            </span>
          </div>
          <Progress 
            value={Math.min(percentage, 100)} 
            className={cn(
              "h-2",
              atLimit && "[&>div]:bg-destructive",
              nearLimit && !atLimit && "[&>div]:bg-yellow-500"
            )}
          />
        </div>
      )}

      {nearLimit && !atLimit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limite bientôt atteinte</AlertTitle>
          <AlertDescription>
            Vous approchez de votre limite mensuelle de générations IA. 
            <Button
              variant="link"
              className="h-auto p-0 ml-1"
              onClick={() => window.location.href = '/billing'}
            >
              Mettre à niveau votre plan
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {atLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limite atteinte</AlertTitle>
          <AlertDescription>
            Vous avez atteint votre limite mensuelle de générations IA.
            <Button
              variant="link"
              className="h-auto p-0 ml-1 text-destructive-foreground underline"
              onClick={() => window.location.href = '/billing'}
            >
              Mettre à niveau maintenant
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div 
        onClick={atLimit ? undefined : handleGenerate}
        className={cn(atLimit && "opacity-50 cursor-not-allowed")}
      >
        {React.cloneElement(children as React.ReactElement, {
          disabled: disabled || checking || atLimit,
        })}
      </div>
    </div>
  );
}