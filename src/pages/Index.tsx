import { useEffect, useState, useMemo } from "react";
import { useQuery, QueryFunctionContext } from "@tanstack/react-query";
import {
  Order as WooCommerceOrder,
  getAllOrders
} from "@/lib/woocommerce";
import { formatPrice, formatDate } from "@/utils/formatters";
import KPICard from "@/components/Dashboard/KPICard";
import OrdersTable from "@/components/Dashboard/OrdersTable";
import RevenueChart from "@/components/Dashboard/RevenueChart";
import OrderStatusPieChart from "@/components/Dashboard/OrderStatusPieChart";
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, CheckCircle, CreditCard, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import * as ss from 'simple-statistics';

// Re-introduce time periods, adding 'all'
const timePeriods = {
  all: { label: "Total" },
  day: { label: "Aujourd'hui" },
  week: { label: "Cette Semaine" },
  month: { label: "Ce Mois" },
  quarter: { label: "Ce Trimestre" },
  year: { label: "Cette Année" },
};

type PeriodKey = keyof typeof timePeriods;

// Helper function to format date as YYYY-MM for grouping
const getYearMonth = (dateString: string): string => {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Format: YYYY-MM
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const getStartOfWeek = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay(); // 0 (Sunday) - 6 (Saturday)
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(date.setDate(diff));
};

const getStartOfMonth = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const getStartOfQuarter = (d: Date): Date => {
  const quarter = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), quarter * 3, 1);
};

const getStartOfYear = (d: Date): Date => {
  return new Date(d.getFullYear(), 0, 1);
};

// Helper function to get date range for a period
const getPeriodDateRange = (period: PeriodKey): { date_min?: string; date_max?: string } => {
  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = new Date(now); // Default end date is now

  // Set time to end of day for endDate consistency
  endDate.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate = getStartOfWeek(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      startDate = getStartOfMonth(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'quarter':
      startDate = getStartOfQuarter(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate = getStartOfYear(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'all':
    default:
      // No date range needed for 'all' - fetch everything
      return {}; 
  }

  // Format dates as ISO 8601 strings (YYYY-MM-DDTHH:mm:ss) required by WooCommerce API
  const formatISO = (date: Date) => date.toISOString().slice(0, 19); // Keep only up to seconds

  return {
    date_min: startDate ? formatISO(startDate) : undefined,
    date_max: endDate ? formatISO(endDate) : undefined, // Use current time as end for ongoing periods
  };
};

// Checks if an order date string falls within the selected period relative to today
const isOrderInPeriod = (orderDateStr: string, period: PeriodKey): boolean => {
  if (period === 'all') return true;

  const orderDate = new Date(orderDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to start of day
  orderDate.setHours(0, 0, 0, 0); // Normalize order date to start of day

  switch (period) {
    case 'day':
      return isSameDay(orderDate, today);
    case 'week':
      const startOfWeek = getStartOfWeek(today);
      return orderDate >= startOfWeek;
    case 'month':
      const startOfMonth = getStartOfMonth(today);
      return orderDate >= startOfMonth;
    case 'quarter':
      const startOfQuarter = getStartOfQuarter(today);
      return orderDate >= startOfQuarter;
    case 'year':
      const startOfYear = getStartOfYear(today);
      return orderDate >= startOfYear;
    default:
      return false;
  }
};

const Index = () => {
  // Re-introduce state for selected period, default to 'all' now
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<PeriodKey>('all'); 
  // Add state for forecast mode
  const [forecastMode, setForecastMode] = useState<boolean>(false);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => getPeriodDateRange(selectedPeriodKey), [selectedPeriodKey]);

  // Fetch Orders data based on the selected period
  // The queryKey now includes the period and date range to ensure unique caching per period
  const { data: periodOrders = [], isLoading: ordersLoading } = useQuery<WooCommerceOrder[]>({
    queryKey: ["woocommerce_orders", undefined /* No customerId filter here */, { ...dateRange, periodKey: selectedPeriodKey } ],
    queryFn: (context) => 
      getAllOrders(context as QueryFunctionContext<[string, undefined, { date_min?: string; date_max?: string; periodKey: PeriodKey }]>) ,
    staleTime: 1000 * 60 * 5, 
  });

  // Calculate Lifetime KPIs using useMemo, now using periodOrders
  const kpiStats = useMemo(() => {
    // No need to filter again if a specific period was selected,
    // as the API call already filtered the data in periodOrders.
    // Only filter if 'all' is selected AND we decide to filter 'all' client-side
    // For now, assume periodOrders contains the correct data for the selected period.
    const ordersToProcess = periodOrders; // Use the data fetched for the period

    console.log(`[Debug] Calculating KPIs for period: ${selectedPeriodKey}. Orders received: ${ordersToProcess.length}`);

    if (!ordersToProcess || ordersToProcess.length === 0) return {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      revenueForPeriod: 0, // Renamed from totalRevenueLifetime
    };

    // Calculate stats based on ordersToProcess (which are already filtered for the period)
    const completed = ordersToProcess.filter(order => order.status === 'completed');
    const pending = ordersToProcess.filter(order => order.status === 'pending');
    
    const revenueForPeriod = completed.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total || '0');
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);

    return {
      totalOrders: ordersToProcess.length, // Orders in the selected period
      pendingOrders: pending.length, // Pending in the selected period
      completedOrders: completed.length, // Completed in the selected period
      revenueForPeriod: revenueForPeriod, 
    };
  }, [periodOrders, selectedPeriodKey]); // Depend on periodOrders and selectedPeriodKey

  // Format data for Revenue Chart using useMemo, using periodOrders
  const chartData = useMemo(() => {
    // Data in periodOrders is already filtered by the selected date range (unless 'all')
    // We still need to filter by status 'completed' for the revenue chart.
    const completedOrdersForChart = periodOrders.filter(order => order.status === 'completed');

    if (!completedOrdersForChart || completedOrdersForChart.length === 0) return [];

    // Determine aggregation format based on the period duration or forecast mode
    const isLongPeriod = ['all', 'year', 'quarter'].includes(selectedPeriodKey);
    const aggregationFormat = (isLongPeriod || forecastMode) ? 'YYYY-MM' : 'YYYY-MM-DD';

    const aggregatedRevenue: { [key: string]: { amount: number, orderCount: number } } = {};

    completedOrdersForChart.forEach(order => {
        const date = new Date(order.date_created);
        let key = '';
        if (aggregationFormat === 'YYYY-MM') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else { // 'YYYY-MM-DD'
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        }
        
        const orderTotal = parseFloat(order.total || '0');
        if (!isNaN(orderTotal)) {
          if (!aggregatedRevenue[key]) aggregatedRevenue[key] = { amount: 0, orderCount: 0 };
          aggregatedRevenue[key].amount += orderTotal;
          aggregatedRevenue[key].orderCount += 1;
        }
      });

    let historicalData = Object.entries(aggregatedRevenue)
      .map(([date, data]) => ({ date, amount: parseFloat(data.amount.toFixed(2)), forecastAmount: undefined })) 
      .sort((a, b) => a.date.localeCompare(b.date));

    // Forecasting logic remains the same, but applied to potentially smaller dataset
    if (forecastMode && historicalData.length >= 2 && (aggregationFormat === 'YYYY-MM')) { 
      const regressionData = historicalData.map((point, index) => [index, point.amount]);
      const { m, b } = ss.linearRegression(regressionData);
      const line = ss.linearRegressionLine({ m, b });
      const lastHistoricalDate = new Date(historicalData[historicalData.length - 1].date + '-01'); 
      const forecastPoints = 3; 

      for (let i = 1; i <= forecastPoints; i++) {
        const nextDate = new Date(lastHistoricalDate);
        nextDate.setMonth(lastHistoricalDate.getMonth() + i);
        const forecastDateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
        const predictedAmount = line(historicalData.length -1 + i);
        
        historicalData.push({
          date: forecastDateKey,
          amount: undefined, 
          forecastAmount: parseFloat(Math.max(0, predictedAmount).toFixed(2)) 
        });
      }
    }
    return historicalData;
  // Depend on periodOrders, selectedPeriodKey, and forecastMode
  }, [periodOrders, selectedPeriodKey, forecastMode]); 

  const isLoading = ordersLoading;

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 bg-gray-50">
            <div className="animate-pulse space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
              <div className="h-80 bg-gray-200 rounded-xl"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                 {/* Period Selector */}
                 <Select value={selectedPeriodKey} onValueChange={(value) => setSelectedPeriodKey(value as PeriodKey)}>
                   <SelectTrigger className="w-full sm:w-[180px]">
                     <SelectValue placeholder="Sélectionner période" />
                   </SelectTrigger>
                   <SelectContent>
                     {(Object.keys(timePeriods) as PeriodKey[]).map(key => (
                        <SelectItem key={key} value={key}>
                          {timePeriods[key].label}
                        </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
                 {/* Forecast Toggle */}
                 <div className="flex items-center space-x-2">
                   <Switch 
                     id="forecast-mode"
                     checked={forecastMode}
                     onCheckedChange={setForecastMode}
                   />
                   <Label htmlFor="forecast-mode" className="flex items-center gap-1">
                     <TrendingUp className="h-4 w-4" />
                     Prévision
                   </Label>
                 </div>
              </div>
          </div>
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <KPICard 
              title="Total commandes" 
              value={kpiStats.totalOrders}
              icon={<ShoppingCart className="h-5 w-5" />}
            />
            <KPICard 
              title="En attente" 
              value={kpiStats.pendingOrders}
              icon={<Clock className="h-5 w-5" />}
            />
            <KPICard 
              title="Terminées" 
              value={kpiStats.completedOrders}
              icon={<CheckCircle className="h-5 w-5" />}
            />
            <KPICard 
              title={`CA (${timePeriods[selectedPeriodKey].label})`}
              value={formatPrice(kpiStats.revenueForPeriod)}
              icon={<CreditCard className="h-5 w-5" />}
            />
          </div>
          
          {/* Charts & Activity Section - Adjusting breakpoints */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6"> 
            {/* Revenue Chart */}
            {/* Spans 1 col on md+, 1 on xl+ */}
            <div className="md:col-span-1 xl:col-span-1">
              <RevenueChart 
                data={chartData} 
                periodLabel={timePeriods[selectedPeriodKey].label} 
                isForecasting={forecastMode}
              />
            </div>
            {/* Order Status Pie Chart */}
            {/* Spans 1 col on md+, 1 on xl+ */}
            {/* This component might need adjustment if it relies on ALL orders */}
            {/* For now, passing periodOrders. If it needs all orders, we might need a separate query */}
            <div className="md:col-span-1 xl:col-span-1">
               <OrderStatusPieChart orders={periodOrders} /> 
            </div>
            {/* Activity Feed */}
            {/* Spans 2 cols on md/lg (full width below), 1 col on xl+ */}
            {/* ActivityFeed likely needs recent orders, not period-specific ones. */}
            {/* Consider fetching recent orders separately if needed, or adjusting ActivityFeed */}
            <div className="md:col-span-2 xl:col-span-1">
              <ActivityFeed numberOfOrders={5} /> 
            </div>
          </div>
          
          {/* Orders Table */}
          {/* This table also shows periodOrders now. Is this desired? */}
          {/* Or should it always show recent/all orders with pagination? */}
          <OrdersTable orders={periodOrders} /> 
        </main>
      </div>
    </div>
  );
};

export default Index;
