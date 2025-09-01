import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ProtectedRoute from "./components/Auth/ProtectedRoute";
import CampaignDashboard from "./pages/CampaignDashboard";
import CampaignCreate from "./pages/CampaignCreate";
import CampaignEdit from "./pages/CampaignEdit";
import CampaignDetails from "./pages/CampaignDetails";
import EmailSettings from "./pages/EmailSettings";
import { queryConfig } from "./lib/queryConfig";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./hooks/use-theme";
import { AppShell } from "./components/Layout/AppShell";

const queryClient = new QueryClient(queryConfig);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
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
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/campaigns" element={<CampaignDashboard />} />
                <Route path="/campaigns/create" element={<CampaignCreate />} />
                <Route path="/campaigns/:id" element={<CampaignDetails />} />
                <Route path="/campaigns/:id/edit" element={<CampaignEdit />} />
                <Route path="/email-settings" element={<EmailSettings />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
