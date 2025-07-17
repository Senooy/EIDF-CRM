import { Campaign } from '@/types/campaign';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CampaignPerformanceChartProps {
  campaigns: Campaign[];
}

export default function CampaignPerformanceChart({ campaigns }: CampaignPerformanceChartProps) {
  const prepareChartData = () => {
    const sortedCampaigns = [...campaigns]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10);

    return sortedCampaigns.map(campaign => ({
      name: campaign.name.length > 20 ? campaign.name.substring(0, 20) + '...' : campaign.name,
      date: format(new Date(campaign.createdAt), 'dd MMM', { locale: fr }),
      Envoyés: campaign.stats.sent,
      Ouverts: campaign.stats.opened,
      Cliqués: campaign.stats.clicked,
      Convertis: campaign.stats.converted,
      'Taux d\'ouverture': parseFloat(((campaign.stats.opened / campaign.stats.delivered) * 100).toFixed(1)),
      'Taux de clic': parseFloat(((campaign.stats.clicked / campaign.stats.opened) * 100).toFixed(2)),
    }));
  };

  const data = prepareChartData();

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <YAxis
            yAxisId="left"
            className="text-xs"
            tick={{ fill: 'hsl(var(--foreground))' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            className="text-xs"
            tick={{ fill: 'hsl(var(--foreground))' }}
            domain={[0, 30]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend
            wrapperStyle={{
              paddingTop: '20px',
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Envoyés"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="Ouverts"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Taux d'ouverture"
            stroke="#10b981"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="Taux de clic"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}