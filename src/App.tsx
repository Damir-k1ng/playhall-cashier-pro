import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { GlobalTimerProvider } from "@/contexts/GlobalTimerContext";
import { NetworkStatusProvider } from "@/contexts/NetworkStatusContext";
import { PlatformAuthProvider, usePlatformAuth } from "@/contexts/PlatformAuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import AppShell from "./pages/AppShell";
import { StationScreen } from "./pages/StationScreen";
import { PreCheckScreen } from "./pages/PreCheckScreen";
import { PaymentScreen } from "./pages/PaymentScreen";
import { AdminCashiers } from "./pages/AdminCashiers";
import NotFound from "./pages/NotFound";
import PlatformLogin from "./pages/platform/PlatformLogin";
import PlatformDashboard from "./pages/platform/PlatformDashboard";
import PlatformClubs from "./pages/platform/PlatformClubs";
import PlatformSubscriptions from "./pages/platform/PlatformSubscriptions";
import PlatformPayments from "./pages/platform/PlatformPayments";
import PlatformAnalytics from "./pages/platform/PlatformAnalytics";
import { PlatformLayout } from "./components/platform/PlatformLayout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PlatformGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = usePlatformAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/platform/login" replace />;
  return <PlatformLayout>{children}</PlatformLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalTimerProvider>
        <NetworkStatusProvider>
          <AuthProvider>
          <PlatformAuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Auth */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* App (POS) routes under /app/:slug */}
              <Route path="/app/:slug" element={<AppShell />} />
              <Route path="/app/:slug/station/:stationId" element={<StationScreen />} />
              <Route path="/app/:slug/precheck/:sessionId" element={<PreCheckScreen />} />
              <Route path="/app/:slug/payment/:sessionId" element={<PaymentScreen />} />
              <Route path="/app/:slug/admin/cashiers" element={<AdminCashiers />} />

              {/* Legacy routes redirect */}
              <Route path="/station/:stationId" element={<Navigate to="/login" replace />} />
              <Route path="/precheck/:sessionId" element={<Navigate to="/login" replace />} />
              <Route path="/payment/:sessionId" element={<Navigate to="/login" replace />} />

              {/* Platform routes */}
              <Route path="/platform/login" element={<PlatformLogin />} />
              <Route path="/platform" element={<PlatformGuard><PlatformDashboard /></PlatformGuard>} />
              <Route path="/platform/clubs" element={<PlatformGuard><PlatformClubs /></PlatformGuard>} />
              <Route path="/platform/subscriptions" element={<PlatformGuard><PlatformSubscriptions /></PlatformGuard>} />
              <Route path="/platform/payments" element={<PlatformGuard><PlatformPayments /></PlatformGuard>} />
              <Route path="/platform/analytics" element={<PlatformGuard><PlatformAnalytics /></PlatformGuard>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </PlatformAuthProvider>
          </AuthProvider>
        </NetworkStatusProvider>
      </GlobalTimerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
