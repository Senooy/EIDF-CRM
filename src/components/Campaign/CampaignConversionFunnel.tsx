import { Campaign } from '@/types/campaign';
import { Progress } from '@/components/ui/progress';

interface CampaignConversionFunnelProps {
  campaigns: Campaign[];
}

export default function CampaignConversionFunnel({ campaigns }: CampaignConversionFunnelProps) {
  const calculateFunnelData = () => {
    const totals = campaigns.reduce((acc, campaign) => {
      const stats = campaign.stats;
      return {
        sent: acc.sent + stats.sent,
        delivered: acc.delivered + stats.delivered,
        opened: acc.opened + stats.opened,
        clicked: acc.clicked + stats.clicked,
        converted: acc.converted + stats.converted,
      };
    }, {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
    });

    return [
      {
        label: 'Envoyés',
        value: totals.sent,
        percentage: 100,
        color: 'bg-blue-500',
      },
      {
        label: 'Délivrés',
        value: totals.delivered,
        percentage: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
        color: 'bg-indigo-500',
      },
      {
        label: 'Ouverts',
        value: totals.opened,
        percentage: totals.sent > 0 ? (totals.opened / totals.sent) * 100 : 0,
        color: 'bg-purple-500',
      },
      {
        label: 'Cliqués',
        value: totals.clicked,
        percentage: totals.sent > 0 ? (totals.clicked / totals.sent) * 100 : 0,
        color: 'bg-pink-500',
      },
      {
        label: 'Convertis',
        value: totals.converted,
        percentage: totals.sent > 0 ? (totals.converted / totals.sent) * 100 : 0,
        color: 'bg-green-500',
      },
    ];
  };

  const funnelData = calculateFunnelData();

  return (
    <div className="space-y-4">
      {funnelData.map((stage, index) => (
        <div key={stage.label} className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">{stage.label}</span>
            <span className="text-muted-foreground">
              {stage.value.toLocaleString()} ({stage.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="relative">
            <Progress
              value={stage.percentage}
              className="h-8"
              indicatorClassName={stage.color}
            />
            {index < funnelData.length - 1 && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <svg
                  className="w-4 h-4 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>
      ))}
      
      <div className="mt-6 pt-4 border-t">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Taux de conversion global</p>
          <p className="text-2xl font-bold">
            {funnelData[0].value > 0 
              ? ((funnelData[4].value / funnelData[0].value) * 100).toFixed(3)
              : '0.000'}%
          </p>
        </div>
      </div>
    </div>
  );
}