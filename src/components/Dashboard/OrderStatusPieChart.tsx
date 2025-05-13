import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// Remove WooCommerceOrder import if no longer needed
// import { Order as WooCommerceOrder } from "@/lib/woocommerce";
import { OrderTotalsReport } from "@/lib/woocommerce"; // Import the report type
import { cn } from "@/lib/utils";

// Mapping status slugs to display names and colors
const statusConfig: { [key: string]: { name: string; color: string } } = {
  pending: { name: "En attente paiement", color: "#fbbf24" }, // amber-400
  processing: { name: "En cours", color: "#3b82f6" }, // blue-500
  "on-hold": { name: "En attente", color: "#f97316" }, // orange-500
  completed: { name: "Terminée", color: "#22c55e" }, // green-500
  cancelled: { name: "Annulée", color: "#ef4444" }, // red-500
  refunded: { name: "Remboursée", color: "#a855f7" }, // purple-500
  failed: { name: "Échouée", color: "#71717a" }, // zinc-500
  // Add other statuses if needed
};

// Define the component props
interface OrderStatusPieChartProps {
  orderTotals: OrderTotalsReport[]; // Expect orderTotals instead of orders
  className?: string;
}

const OrderStatusPieChart = ({ orderTotals, className }: OrderStatusPieChartProps) => {
  const chartData = useMemo(() => {
    // Process orderTotals directly
    if (!orderTotals || orderTotals.length === 0) {
      return [];
    }

    // Transform orderTotals into the format Recharts needs
    return orderTotals
      .filter(item => item.total > 0 && statusConfig[item.slug]) // Only include statuses with counts and config
      .map((item) => ({
        name: statusConfig[item.slug]?.name || item.name || item.slug, // Use configured name, fallback to API name/slug
        value: item.total,
        fill: statusConfig[item.slug]?.color || "#8884d8", // Use configured color, fallback default
      }));

  }, [orderTotals]); // Depend on orderTotals

  const totalOrders = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Répartition des commandes par statut</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
           <div className="flex items-center justify-center h-60 text-gray-500">
             Aucune donnée disponible
           </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const percentage = totalOrders > 0 ? ((data.value / totalOrders) * 100).toFixed(1) : 0;
                    return (
                      <div className="bg-white p-2 shadow rounded border text-sm">
                        <p className="font-semibold">{data.name}</p>
                        <p>{`Commandes: ${data.value}`}</p>
                        <p>{`Pourcentage: ${percentage}%`}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8" // Default fill, overridden by Cell
                dataKey="value"
                nameKey="name"
                // label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                //   const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                //   const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                //   const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                //   return percent > 0.05 ? ( // Only show label if percentage is significant
                //     <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                //       {`${(percent * 100).toFixed(0)}%`}
                //     </text>
                //   ) : null;
                // }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderStatusPieChart; 