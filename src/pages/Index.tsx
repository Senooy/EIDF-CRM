import { useEffect, useState, useMemo } from "react";
import { useQuery, useInfiniteQuery, QueryFunctionContext } from "@tanstack/react-query";
import {
  Order as WooCommerceOrder,
  getAllOrders,
  getOrdersPage,
  PaginatedOrdersResponse
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

  // NEW: Fetch orders using useInfiniteQuery
  const {
    data: infiniteOrdersData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: ordersLoading, // Main loading state for initial fetch
    // error: ordersError, // Optional: handle error state
  } = useInfiniteQuery<PaginatedOrdersResponse, Error, PaginatedOrdersResponse, string[]>( // Explicitly add TData and TQueryKey types
    ['woocommerce_orders_paginated'], // Simple key for now
    // Explicitly type the context object
    async (context: QueryFunctionContext<string[], number | undefined>) => { 
       const pageParam = context.pageParam || 1; // Default to 1 if pageParam is undefined (for the first page)
       console.log("[InfiniteQuery] Fetching page:", pageParam);
       // Fetch 25 orders per page, descending by date
       // Call remains the same, should accept 3 arguments based on definition
       const result = await getOrdersPage(pageParam, 25, { orderby: 'date', order: 'desc' });
       console.log("[InfiniteQuery] Fetched page:", pageParam, "Result:", result);
       return result;
    },
    {
      // Explicitly type the parameters for getNextPageParam
      getNextPageParam: (lastPage: PaginatedOrdersResponse, allPages: PaginatedOrdersResponse[]) => {
        // Calculate the next page number
        const nextPage = allPages.length + 1;
        console.log(`[InfiniteQuery] getNextPageParam called. Last page had ${lastPage.orders.length} orders. Total pages fetched: ${allPages.length}. Total pages available: ${lastPage.totalPages}. Calculated next page: ${nextPage}`);
        // Check if there are more pages to fetch
        if (nextPage <= lastPage.totalPages) {
          console.log(`[InfiniteQuery] Requesting next page: ${nextPage}`)
          return nextPage;
        }
        console.log("[InfiniteQuery] No more pages to fetch.");
        return undefined; // No more pages
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Keep data from previous key when period changes? Optional.
      // keepPreviousData: true, 
    }
  );

  // Derive the flat list of all orders from the paginated data
  const allOrders = useMemo(() => {
    const orders = infiniteOrdersData?.pages.flatMap(page => page.orders) || [];
    console.log(`[Memo] Derived allOrders. Total count: ${orders.length}`);
    return orders;
  }, [infiniteOrdersData]);

  // Calculate Lifetime KPIs using useMemo, now filtered by period
  const kpiStats = useMemo(() => {
    // Filter orders based on the selected period first
    console.log(`[Debug] Calculating KPIs for period: ${selectedPeriodKey}. Total orders before filter: ${allOrders.length}`);
    const filteredOrders = allOrders.filter(order => isOrderInPeriod(order.date_created, selectedPeriodKey));
    console.log(`[Debug] Total orders AFTER filter for period ${selectedPeriodKey}: ${filteredOrders.length}`);

    if (!filteredOrders || filteredOrders.length === 0) return {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      totalRevenueLifetime: 0,
    };

    // Calculate stats based on FILTERED orders
    const completed = filteredOrders.filter(order => order.status === 'completed');
    const pending = filteredOrders.filter(order => order.status === 'pending');
    // Note: totalOrders should reflect the filtered count for the period, 
    // unless we want 'Total commandes (période)' vs 'Total commandes (lifetime)'?
    // Let's show stats for the period.

    const revenueForPeriod = completed.reduce((sum, order) => {
        // Ensure 'total' is treated as a number, handling potential null/undefined/empty strings
        const orderTotal = parseFloat(order.total || '0');
        return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);

    return {
      totalOrders: filteredOrders.length, // Orders in the selected period
      pendingOrders: pending.length, // Pending in the selected period
      completedOrders: completed.length, // Completed in the selected period
      revenueForPeriod: revenueForPeriod, 
    };
  }, [allOrders, selectedPeriodKey]);

  // Format data for Revenue Chart using useMemo, now filtered by period
  const chartData = useMemo(() => {
    const filteredRawOrders = allOrders.filter(order => 
        isOrderInPeriod(order.date_created, selectedPeriodKey) && order.status === 'completed'
    );
    
    console.log(`[Chart] Calculating chart data for period ${selectedPeriodKey}. Filtered orders: ${filteredRawOrders.length}`);

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
  }, [allOrders, selectedPeriodKey, forecastMode]); // Add forecastMode to dependencies

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
          {/* Load More Button */}
          <div className="flex justify-center mt-4 mb-4"> 
            {hasNextPage && (
              <Button 
                onClick={() => fetchNextPage()} 
                disabled={isFetchingNextPage}
                variant="outline"
              >
                {isFetchingNextPage ? 'Chargement...' : 'Charger plus d\'anciennes commandes'}
              </Button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
