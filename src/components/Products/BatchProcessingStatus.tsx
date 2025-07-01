import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface BatchProcessingStatusProps {
  total: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
}

export function BatchProcessingStatus({
  total,
  completed,
  failed,
  isProcessing,
}: BatchProcessingStatusProps) {
  const progress = total > 0 ? ((completed + failed) / total) * 100 : 0;
  const successful = completed - failed;

  return (
    <Alert>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : progress === 100 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription>
              {isProcessing
                ? `Processing ${completed + failed} of ${total} products...`
                : `Completed processing ${total} products`}
            </AlertDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {successful} successful, {failed} failed
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </Alert>
  );
}