import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Order as WooCommerceOrder
} from "@/lib/woocommerce-multi";
import { useCachedOrders } from "@/hooks/useCachedData";
import { formatPrice, formatDate } from "@/utils/formatters";
import KPICard from "@/components/Dashboard/KPICard";
import OrdersTable from "@/components/Dashboard/OrdersTable";
import RevenueChart from "@/components/Dashboard/RevenueChart";
import OrderStatusPieChart from "@/components/Dashboard/OrderStatusPieChart";
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Clock, CheckCircle, CreditCard, TrendingUp, RefreshCw, Database } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import * as ss from 'simple-statistics';
import { RequireSite } from "@/components/RequireSite";

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
  // Cache toggle
  const [useCache, setUseCache] = useState(true);

  // Use cached orders with filter based on period
  const {
    data: cachedOrders,
    isLoading: cacheLoading,
    isSyncing,
    error: cacheError,
    totalCount: cachedTotalCount,
    lastSync,
    isStale,
    sync
  } = useCachedOrders({
    bypassCache: !useCache,
    autoSync: false,
    perPage: 9999, // Get all orders for dashboard
    filter: selectedPeriodKey !== 'all' ? (order: any) => {
      return isOrderInPeriod(order.date_created, selectedPeriodKey);
    } : undefined,
    sort: (a: any, b: any) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
  });
  
  const ordersLoading = cacheLoading;
  const allOrders = cachedOrders || [];

  // Calculate stats from cached orders
  const kpiStats = useMemo(() => {
    if (!allOrders || allOrders.length === 0) {
      return {
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        revenueForPeriod: 0,
      };
    }

    const completed = allOrders.filter(order => order.status === 'completed');
    const pending = allOrders.filter(order => order.status === 'pending');

    const revenueForPeriod = completed.reduce((sum, order) => {
        const orderTotal = parseFloat(order.total || '0');
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);

    return {
      totalOrders: allOrders.length,
      pendingOrders: pending.length,
      completedOrders: completed.length,
      revenueForPeriod: revenueForPeriod,
    };
  }, [allOrders]);

  // Format data for Revenue Chart using useMemo
  const chartData = useMemo(() => {
    // Use all fetched orders for chart (they're already filtered by period)
    const filteredRawOrders = allOrders.filter(order => order.status === 'completed');

    if (!filteredRawOrders || filteredRawOrders.length === 0) return [];

    const aggregationFormat = (selectedPeriodKey === 'year' || selectedPeriodKey === 'all' || selectedPeriodKey === 'quarter') 
                              ? 'YYYY-MM' 
                              : 'YYYY-MM-DD';

    const aggregatedRevenue: { [key: string]: { amount: number, orderCount: number } } = {};

    filteredRawOrders.forEach(order => {
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
  }, [allOrders, forecastMode]); // Removed selectedPeriodKey as orders are already filtered

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
    <RequireSite>
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
                 
                 {/* Cache Toggle */}
                 <div className="flex items-center gap-2">
                   <Switch
                     id="use-cache"
                     checked={useCache}
                     onCheckedChange={setUseCache}
                   />
                   <Label htmlFor="use-cache" className="flex items-center gap-2 cursor-pointer">
                     <Database className="h-4 w-4" />
                     Cache
                     {useCache && lastSync && (
                       <Badge variant={isStale ? "secondary" : "default"} className="text-xs">
                         {isStale ? "Obsolète" : "À jour"}
                       </Badge>
                     )}
                   </Label>
                 </div>
                 
                 {/* Sync Button */}
                 {useCache && (
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={sync}
                     disabled={isSyncing}
                   >
                     {isSyncing ? (
                       <>
                         <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                         Sync...
                       </>
                     ) : (
                       <>
                         <RefreshCw className="h-4 w-4 mr-2" />
                         Sync
                       </>
                     )}
                   </Button>
                 )}
                 
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
               <OrderStatusPieChart orders={allOrders} />
            </div>
            {/* Activity Feed */}
            {/* Spans 2 cols on md/lg (full width below), 1 col on xl+ */}
            <div className="md:col-span-2 xl:col-span-1">
              <ActivityFeed numberOfOrders={5} /> 
            </div>
          </div>
          
          {/* Orders Table */}
          <OrdersTable orders={allOrders} />
        </main>
      </div>
    </div>
    </RequireSite>
  );
};

export default Index;
