import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface RevenueChartProps {
  data: Array<{
    date: string;
    amount: number;
    forecastAmount?: number;
  }>;
  periodLabel?: string;
  isForecasting?: boolean;
}

// Mock data for the chart
const mockChartData = [
  { date: "01/05", amount: 450 },
  { date: "02/05", amount: 320 },
  { date: "03/05", amount: 680 },
  { date: "04/05", amount: 520 },
  { date: "05/05", amount: 790 },
  { date: "06/05", amount: 890 },
  { date: "07/05", amount: 1200 },
  { date: "08/05", amount: 980 },
  { date: "09/05", amount: 1300 },
  { date: "10/05", amount: 1500 },
  { date: "11/05", amount: 1250 },
  { date: "12/05", amount: 1800 },
];

const RevenueChart = ({ data, periodLabel, isForecasting }: RevenueChartProps) => {
  const chartTitle = periodLabel ? `Chiffre d'affaires (${periodLabel})` : "Chiffre d'affaires";
  const displayData = data && data.length > 0 ? data : [];

  // Helper function to format date strings (YYYY-MM-DD or YYYY-MM) to French format
  const formatFrenchDate = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) { // YYYY-MM-DD
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else if (parts.length === 2) { // YYYY-MM
      return `${parts[1]}/${parts[0]}`;
    }
    return dateStr; // Fallback
  };

  return (
    <div className="h-full w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-base font-medium text-gray-900 mb-4">{chartTitle}</h3>
      <div className="h-64">
        {displayData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Aucune donnée de revenus pour cette période.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={displayData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={formatFrenchDate}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#6b7280' }} 
                tickFormatter={(value) => `${value}€`}
                width={80}
              />
              <Legend verticalAlign="top" height={36}/>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  fontSize: '0.875rem'
                }}
                formatter={(value) => [`${typeof value === 'number' ? value.toFixed(2) : value} €`, 'Montant']}
                labelFormatter={(label) => `Date: ${formatFrenchDate(label)}`}
              />
              <Line 
                name="Revenu Réel"
                type="monotone" 
                dataKey="amount" 
                stroke="#0284c7" 
                strokeWidth={2} 
                dot={{ fill: "#0284c7", strokeWidth: 2, r: 4 }}
                activeDot={{ fill: "#0284c7", strokeWidth: 2, r: 6 }}
              />
              {isForecasting && (
                <Line 
                  name="Prévision"
                  type="monotone" 
                  dataKey="forecastAmount" 
                  stroke="#82ca9d"
                  strokeDasharray="5 5"
                  dot={{ fill: "#82ca9d", strokeWidth: 2, r: 4 }}
                  activeDot={{ fill: "#82ca9d", strokeWidth: 2, r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RevenueChart;
