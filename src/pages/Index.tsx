import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Order as WooCommerceOrder,
  getAllOrders,
  GetOrdersOptions
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

// Checks if an order date string falls within the selected period relative to today
const isOrderInPeriod = (orderDateStr: string, period: PeriodKey): boolean => {
  // if (period === 'all') return true; // REMOVE: 'all' is no longer a valid PeriodKey

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

// Helper to get ISO start of day string (YYYY-MM-DDTHH:mm:ss)
const getISODateStartString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00`;
};

// Helper to get ISO end of day string (YYYY-MM-DDTHH:mm:ss)
const getISODateEndString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T23:59:59`;
};

// Calculate date range {after, before} for the API query based on period key
const getDateRangeForPeriod = (period: PeriodKey): { after?: string; before?: string } | null => {
  const today = new Date();
  let startDate: Date;
  const endDate = new Date(); // Use current date as end date for ongoing periods

  switch (period) {
    case 'day':
      // For 'today', we need orders *after* the beginning of today and *before* the end of today.
      return {
        after: getISODateStartString(today),
        before: getISODateEndString(today)
      };
    case 'week':
      startDate = getStartOfWeek(today);
      // After start of the week, before end of today
      return {
        after: getISODateStartString(startDate),
        before: getISODateEndString(endDate)
      };
    case 'month':
      startDate = getStartOfMonth(today);
      // After start of the month, before end of today
      return {
        after: getISODateStartString(startDate),
        before: getISODateEndString(endDate)
      };
    case 'quarter':
      startDate = getStartOfQuarter(today);
      // After start of the quarter, before end of today
      return {
        after: getISODateStartString(startDate),
        before: getISODateEndString(endDate)
      };
    case 'year':
      startDate = getStartOfYear(today);
      // After start of the year, before end of today
      return {
        after: getISODateStartString(startDate),
        before: getISODateEndString(endDate)
      };
    // No 'all' case
    default:
      // Should be unreachable due to TypeScript PeriodKey
      console.warn("Invalid period key:", period);
      return null; // Return null for invalid period
  }
};

const Index = () => {
  // Re-introduce state for selected period, default to 'all' now
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<PeriodKey>('month'); 
  // Add state for forecast mode
  const [forecastMode, setForecastMode] = useState<boolean>(false);

  // Calculate query options based on selected period
  const queryOptions = useMemo(() => {
    const range = getDateRangeForPeriod(selectedPeriodKey);
    // Create the options object for the query key and API call
    // Return undefined if range is null to disable query
    return range ? ({ date_after: range.after, date_before: range.before } as GetOrdersOptions) : undefined;
  }, [selectedPeriodKey]);

  // Fetch orders based on selected period using queryOptions
  const { data: periodOrders = [], isLoading: ordersLoading } = useQuery<WooCommerceOrder[]>({ 
    queryKey: ["woocommerce_orders_period", queryOptions], // Key includes options
    // queryFn: (context) => getAllOrders(context), // Pass context, getAllOrders extracts options // OLD -> Type Error
    // Pass only the options part of the query key, which getAllOrders uses
    queryFn: ({ queryKey }) => getAllOrders(queryKey[1] as GetOrdersOptions | undefined),
    staleTime: 1000 * 60 * 5, 
    enabled: !!queryOptions, // Only run query if queryOptions is valid
  });

  // Calculate KPIs for the selected period using the fetched periodOrders
  const kpiStats = useMemo(() => {
    // Use periodOrders directly as they are already filtered by the API call
    console.log(`[Debug] Calculating KPIs for period: ${selectedPeriodKey}. Orders received from API: ${periodOrders.length}`);

    if (!periodOrders || periodOrders.length === 0) return {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      // totalRevenueLifetime: 0, // OLD - Mismatched property name
      revenueForPeriod: 0,    // CORRECTED - Ensure this matches the structure used by KPICard
    };

    // Calculate stats based on FILTERED orders by API now
    const completed = periodOrders.filter(order => order.status === 'completed');
    const pending = periodOrders.filter(order => order.status === 'pending');
    
    const revenueForPeriod = completed.reduce((sum, order) => {
        // Ensure 'total' is treated as a number, handling potential null/undefined/empty strings
        const orderTotal = parseFloat(order.total || '0');
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);

    return {
      totalOrders: periodOrders.length, // Orders in the selected period
      pendingOrders: pending.length, // Pending in the selected period
      completedOrders: completed.length, // Completed in the selected period
      revenueForPeriod: revenueForPeriod, 
    };
  }, [periodOrders, selectedPeriodKey]); // Use periodOrders

  // Format data for Revenue Chart using periodOrders
  const chartData = useMemo(() => {
    const completedOrdersForChart = periodOrders.filter(order => order.status === 'completed');

    if (!completedOrdersForChart || completedOrdersForChart.length === 0) return [];

    const aggregationFormat = (selectedPeriodKey === 'year' || selectedPeriodKey === 'quarter') 
                              ? 'YYYY-MM' 
                              : 'YYYY-MM-DD';

    const aggregatedRevenue: { [key: string]: { amount: number, orderCount: number } } = {};

    completedOrdersForChart.forEach(order => {
        const date = new Date(order.date_created);
        let key = '';
        if (aggregationFormat === 'YYYY-MM') {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        } else {
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
      .map(([date, data]) => ({ date, amount: parseFloat(data.amount.toFixed(2)), forecastAmount: undefined })) // ensure amount is number, add forecastAmount
      .sort((a, b) => a.date.localeCompare(b.date));

    if (forecastMode && historicalData.length >= 2 && (aggregationFormat === 'YYYY-MM')) { // Forecast only for YYYY-MM for now
      // Prepare data for linear regression: [index, amount]
      const regressionData = historicalData.map((point, index) => [index, point.amount]);
      
      // Calculate linear regression
      const { m, b } = ss.linearRegression(regressionData);
      const line = ss.linearRegressionLine({ m, b });

      const lastHistoricalDate = new Date(historicalData[historicalData.length - 1].date + '-01'); // Ensure it's a valid date
      const forecastPoints = 3; // Predict next 3 months

      for (let i = 1; i <= forecastPoints; i++) {
        const nextDate = new Date(lastHistoricalDate);
        nextDate.setMonth(lastHistoricalDate.getMonth() + i);
        const forecastDateKey = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
        const predictedAmount = line(historicalData.length -1 + i);
        
        historicalData.push({
          date: forecastDateKey,
          amount: undefined, // No actual amount for forecast
          forecastAmount: parseFloat(Math.max(0, predictedAmount).toFixed(2)) // Ensure forecast is not negative
        });
      }
    }
    return historicalData;
  }, [periodOrders, selectedPeriodKey, forecastMode]); // Add forecastMode to dependencies

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
            <div className="md:col-span-1 xl:col-span-1">
               <OrderStatusPieChart orders={periodOrders} />
            </div>
            {/* Activity Feed */}
            {/* Spans 2 cols on md/lg (full width below), 1 col on xl+ */}
            <div className="md:col-span-2 xl:col-span-1">
              <ActivityFeed numberOfOrders={5} /> 
            </div>
          </div>
          
          {/* Orders Table */}
          <OrdersTable orders={periodOrders} />
        </main>
      </div>
    </div>
  );
};

export default Index;
