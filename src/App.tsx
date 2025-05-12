import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import OrderDetails from "./pages/OrderDetails";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import OrdersListPage from "./pages/OrdersListPage";
import CustomersListPage from "./pages/CustomersListPage";
import CustomerDetailsPage from "./pages/CustomerDetailsPage";
import ProductsListPage from "./pages/ProductsListPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const ProtectedLayout = () => (
  <Outlet />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
