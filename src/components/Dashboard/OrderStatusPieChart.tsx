import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Order as WooCommerceOrder } from '@/lib/woocommerce';
import { translateOrderStatus } from '@/utils/formatters'; // Assuming you might want to translate status names

interface OrderStatusPieChartProps {
  orders: WooCommerceOrder[];
}

// Define a consistent color palette for order statuses
// These are just examples, you can customize them
const STATUS_COLORS: { [key: string]: string } = {
  'pending': '#FFBB28',    // Amber
  'processing': '#0088FE', // Blue
  'on-hold': '#FF8042',    // Orange
  'completed': '#00C49F',  // Green
  'cancelled': '#FF0000',  // Red
  'refunded': '#8884D8',   // Purple
  'failed': '#F50057',    // Pink/Red
  'default': '#CCCCCC',     // Grey for any other status
};

const OrderStatusPieChart = ({ orders }: OrderStatusPieChartProps) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="h-full w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
        <p className="text-gray-500">Aucune donnée de commande pour le graphique.</p>
      </div>
    );
  }

  const statusCounts = orders.reduce((acc, order) => {
    const status = order.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  const chartData = Object.entries(statusCounts).map(([status, count]) => ({
    name: translateOrderStatus(status), // Translate status for display
    value: count,
    fill: STATUS_COLORS[status] || STATUS_COLORS['default'],
  }));

  return (
    <div className="h-full w-full p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-base font-medium text-gray-900 mb-4">Répartition des Commandes par Statut</h3>
      <ResponsiveContainer width="100%" height={300}> {/* Adjust height as needed */}
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            // label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8" // Default fill, will be overridden by Cell
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} (${((value / orders.length) * 100).toFixed(1)}%)`, name]} />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OrderStatusPieChart; 