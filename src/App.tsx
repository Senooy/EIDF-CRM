import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import OrderDetails from "./pages/OrderDetails";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import OrdersListPage from "./pages/OrdersListPage";
import CustomersListPage from "./pages/CustomersListPage";
import CustomerDetailsPage from "./pages/CustomerDetailsPage";
import ProductsListPage from "./pages/ProductsListPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import SiteConfiguration from "./pages/Settings/SiteConfiguration";
import SyncSettings from "./pages/Settings/SyncSettings";
import WordPressDashboard from "./pages/WordPressDashboard";
import WooCommerceDashboard from "./pages/WooCommerceDashboard";
import { queryConfig } from "./lib/queryConfig";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { queryErrorHandler } from "./lib/error-handler";

const queryClient = new QueryClient(queryConfig);

const ProtectedLayout = () => (
  <Outlet />
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <ProtectedLayout />
                </ProtectedRoute>
              }
            >
            <Route path="/" element={<Index />} />
            <Route path="/orders/:id" element={<OrderDetails />} />
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/customers" element={<CustomersListPage />} />
            <Route path="/customer/:id" element={<CustomerDetailsPage />} />
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/wordpress" element={<WordPressDashboard />} />
            <Route path="/woocommerce" element={<WooCommerceDashboard />} />
            <Route path="/settings/sites" element={<SiteConfiguration />} />
            <Route path="/settings/sync" element={<SyncSettings />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
