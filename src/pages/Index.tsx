import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Order as WooCommerceOrder,
  getSalesReport,
  SalesReport,
  getOrderTotalsReport,
  OrderTotalsReport
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

  // Fetch Sales Report data for KPIs and Revenue Chart
  const { data: salesReportData, isLoading: salesReportLoading } = useQuery<SalesReport>({
    queryKey: ["woocommerce_sales_report", selectedPeriodKey],
    queryFn: () => {
        // Map our PeriodKey to what getSalesReport expects
        let reportPeriod = selectedPeriodKey;
        if (selectedPeriodKey === 'all') reportPeriod = 'year'; // API might not have 'all', default to 'year' or handle appropriately
        // For 'all', getSalesReport might need special handling or a very long range if API doesn't support 'all' directly
        // For now, let's assume 'year' for 'all' as a placeholder.
        // Or, we could disable 'all' for reports if API doesn't support it well.
        // For simplicity, if selectedPeriodKey is 'all', we might fetch for 'year' and label it 'Total'
        // The getSalesReport in woocommerce.ts handles 'quarter' logic correctly by calculating date_min/max.
        // For 'day', 'week', 'month', 'year', it passes them directly.
        return getSalesReport(reportPeriod as 'day' | 'week' | 'month' | 'quarter' | 'year');
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch Order Totals Report for Pie Chart and order count KPIs
  const { data: orderTotalsData, isLoading: orderTotalsLoading } = useQuery<OrderTotalsReport[]>({ 
    queryKey: ["woocommerce_order_totals_report", selectedPeriodKey], // Period key might not be used by this specific API endpoint, but included for consistency
    queryFn: () => getOrderTotalsReport(), // This API endpoint often doesn't take period filters
    staleTime: 1000 * 60 * 5, 
  });

  // Calculate KPIs based on report data
  const kpiStats = useMemo(() => {
    let totalRevenueForPeriod = 0;
    let totalOrdersForPeriod = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;

    if (salesReportData?.totals) {
      // Sum up totals from all intervals in the sales report for the period
      // This depends on the structure of salesReportData.totals
      // If totals is an object keyed by date/interval:
      Object.values(salesReportData.totals).forEach(totalEntry => {
        totalRevenueForPeriod += parseFloat(totalEntry.sales || '0');
        totalOrdersForPeriod += totalEntry.orders || 0;
      });
    }
    // If selectedPeriodKey is 'all', the sales report might give lifetime, or for a default like 'year'.
    // The label for revenue will be `CA (${timePeriods[selectedPeriodKey].label})`

    if (orderTotalsData) {
      // Sum up order counts from orderTotalsData for specific statuses
      // This report gives current counts by status, not necessarily for a specific period.
      // So this shows LIFETIME pending/completed unless the report can be filtered.
      // The current getOrderTotalsReport in woocommerce.ts does not filter by period.
      // For now, we'll use these as lifetime counts if period is 'all', or acknowledge they are not period-specific.

      // If we want period-specific counts here, we'd need to process salesReportData.intervals
      // or adjust getOrderTotalsReport if the API supports period filtering.

      // For simplicity, let's use salesReportData for totalOrdersForPeriod as it's period-specific.
      // And orderTotalsData for status-specific counts (which are currently lifetime).
      orderTotalsData.forEach(statusTotal => {
        if (statusTotal.slug === 'pending') pendingOrdersCount = statusTotal.total;
        if (statusTotal.slug === 'completed') completedOrdersCount = statusTotal.total;
        // if (selectedPeriodKey === 'all') totalOrdersForPeriod += statusTotal.total; // This would be all-time total
      });

      // If selectedPeriodKey is 'all', we use totalOrdersForPeriod from sales report (e.g., for the year)
      // and lifetime pending/completed counts. This is a bit of a mix.
      // A true "Total" period that sums up everything would need all orders.
      // Given the move away from fetching all orders, KPIs for "Total" will reflect the chosen report period (e.g. 'year') or be lifetime counts.
    }

    return {
      totalOrders: totalOrdersForPeriod, // From sales report, period-specific
      pendingOrders: pendingOrdersCount,   // From order totals, currently lifetime
      completedOrders: completedOrdersCount, // From order totals, currently lifetime
      revenueForPeriod: totalRevenueForPeriod, // From sales report, period-specific
    };
  }, [salesReportData, orderTotalsData, selectedPeriodKey]);

  // Format data for Revenue Chart using sales report data
  const chartData = useMemo(() => {
    if (!salesReportData || !salesReportData.intervals || salesReportData.intervals.length === 0) return [];

    let historicalData = salesReportData.intervals
      .map(interval => ({
        date: interval.interval, // API provides date string like "2024-05-13"
        amount: parseFloat(interval.subtotals.sales || '0'),
        forecastAmount: undefined,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Forecast logic needs to be adapted as the date format might be daily from sales report
    // For monthly forecast, we would need to aggregate daily data to monthly first.
    // Let's simplify and only enable forecast if data looks monthly (e.g. period is year/quarter/all)
    const isMonthlyData = selectedPeriodKey === 'year' || selectedPeriodKey === 'all' || selectedPeriodKey === 'quarter';

    if (forecastMode && historicalData.length >= 2 && isMonthlyData) { 
      // Prepare data for linear regression: [index, amount]
      const regressionData = historicalData.map((point, index) => [index, point.amount]);
      
      // Calculate linear regression
      const { m, b } = ss.linearRegression(regressionData);
      const line = ss.linearRegressionLine({ m, b });

      // Ensure lastHistoricalDate is correctly parsed; salesReportData.intervals.interval could be YYYY-MM-DD or YYYY-MM
      // Assuming it's YYYY-MM if isMonthlyData is true, or we need to adjust
      const lastDateStr = historicalData[historicalData.length - 1].date;
      const lastHistoricalDate = new Date(lastDateStr.includes('-') ? lastDateStr : `${lastDateStr.substring(0,4)}-${lastDateStr.substring(4,6)}-01`);

      const forecastPoints = 3; // Predict next 3 months

      for (let i = 1; i <= forecastPoints; i++) {
        const nextDate = new Date(lastHistoricalDate);
        nextDate.setMonth(lastHistoricalDate.getMonth() + i);
        // Format forecastDateKey to match historical data's date format (YYYY-MM or YYYY-MM-DD)
        // If historical is YYYY-MM-DD from daily report, forecasting monthly doesn't align directly.
        // This forecast logic might need significant rework if sales report gives daily data for monthly views.
        // For now, assume historicalData.date is YYYY-MM if isMonthlyData is true.
        const forecastDateKey = isMonthlyData 
          ? `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
          : `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`; // Fallback, may not be right

        const predictedAmount = line(historicalData.length -1 + i);
        
        historicalData.push({
          date: forecastDateKey,
          amount: undefined, // No actual amount for forecast
          forecastAmount: parseFloat(Math.max(0, predictedAmount).toFixed(2)) // Ensure forecast is not negative
        });
      }
    }
    return historicalData;
  }, [salesReportData, selectedPeriodKey, forecastMode]);

  const isLoading = salesReportLoading || orderTotalsLoading;

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
               <OrderStatusPieChart orderTotals={orderTotalsData || []} />
            </div>
            {/* Activity Feed */}
            {/* Spans 2 cols on md/lg (full width below), 1 col on xl+ */}
            <div className="md:col-span-2 xl:col-span-1">
              <ActivityFeed numberOfOrders={5} /> 
            </div>
          </div>
          
          {/* Orders Table */}
          <OrdersTable /> {/* Remove orders prop, it fetches its own data */}
        </main>
      </div>
    </div>
  );
};

export default Index;
