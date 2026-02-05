import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { FeatureProvider } from "@/contexts/FeatureContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Feedback from "./pages/Feedback";
import CompleteProfile from "./pages/CompleteProfile";
import Products from "./pages/Products";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
// import OrderTracking from "./pages/OrderTracking"; // Old tracking
import PremiumOrderTracking from "./pages/PremiumOrderTracking"; // Premium tracking
import FormBuilderPage from "@/pages/FormBuilderPage";
import FormViewerPage from "@/pages/FormViewerPage";
import FormResponsesPage from "@/pages/FormResponsesPage";
import Receipt from "./pages/Receipt";
import AdminDashboard from "./pages/AdminDashboard";
import RunnerDashboard from "./pages/RunnerDashboard";
import Wallet from "./pages/Wallet";
import Favorites from "./pages/Favorites";
import ProductDetail from "./pages/ProductDetail";
import NotificationSettings from "./pages/NotificationSettings";
import UserProfile from "./pages/UserProfile";
import Settings from "./pages/Settings";
import PrivacySecurity from "./pages/PrivacySecurity";
import SecurityTrust from "./pages/SecurityTrust";
import SecurityDashboard from "./pages/admin/SecurityDashboard";
import PaymentMethods from "./pages/PaymentMethods";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import OfflinePage from "./pages/OfflinePage";
import EmailPreviews from "./pages/EmailPreviews";
import QrRedirect from "./pages/QrRedirect";
import { ThemeProvider } from "./components/ThemeProvider";
// New Feature Pages
import GroupOrdering from "./pages/GroupOrdering";
import Subscriptions from "./pages/Subscriptions";
import Achievements from "./pages/Achievements";
import Messages from "./pages/Messages";
import GroupCheckout from "./pages/GroupCheckout";
// Premium Feature Pages - Temporarily disabled
// import SpinWheelPage from "./pages/SpinWheelPage";
// import FlashDealsPage from "./pages/FlashDealsPage";
import SnackzoAI from "./components/SnackzoAI";
import { SocialProofToast } from "./components/SocialProofToast";
import { LiveChat } from "./components/LiveChat";
import SnackzoPayGateway from "./pages/SnackzoPayGateway";
import SnackzoPayConfirm from "./pages/SnackzoPayConfirm";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { QuickCart } from "@/components/QuickCart";
import { AuthTransition } from "@/components/AuthTransition";

const queryClient = new QueryClient();

import { ProtectedRoute } from "./components/ProtectedRoute";
import { usePageTracking } from "./hooks/usePageTracking";

const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  // Hide global navigation and chat widgets on public form viewer pages
  const isPublicForm = location.pathname.startsWith('/forms/');

  // Track page views for analytics
  usePageTracking();

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />

        {/* Authenticated Routes */}
        <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
        <Route path="/orders/:orderId" element={<ProtectedRoute><PremiumOrderTracking /></ProtectedRoute>} />
        <Route path="/receipt/:orderId" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
        <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/privacy-security" element={<ProtectedRoute><PrivacySecurity /></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><NotificationSettings /></ProtectedRoute>} />
        <Route path="/payment-methods" element={<ProtectedRoute><PaymentMethods /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
        <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />

        {/* New Feature Routes */}
        <Route path="/group-order" element={<ProtectedRoute><GroupOrdering /></ProtectedRoute>} />
        <Route path="/group-order/:groupId" element={<ProtectedRoute><GroupOrdering /></ProtectedRoute>} />
        <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
        <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
        <Route path="/group-checkout/:groupId" element={<ProtectedRoute><GroupCheckout /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />

        {/* Admin/Staff Routes */}
        <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/form-builder" element={<ProtectedRoute requireAdmin={true}><FormBuilderPage /></ProtectedRoute>} />
        <Route path="/admin/forms/:formId/responses" element={<ProtectedRoute requireAdmin={true}><FormResponsesPage /></ProtectedRoute>} />
        {/* <Route path="/admin/security" element={<ProtectedRoute requireAdmin={true}><SecurityDashboard /></ProtectedRoute>} /> */}
        <Route path="/runner" element={<RunnerDashboard />} />

        {/* Semi-Public Routes */}
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/forms/:formId" element={<FormViewerPage />} />

        {/* SnackzoPay Gateway */}
        <Route path="/pay" element={<ProtectedRoute><SnackzoPayGateway /></ProtectedRoute>} />
        <Route path="/pay/confirm" element={<ProtectedRoute><SnackzoPayConfirm /></ProtectedRoute>} />

        {/* Public Trust Page */}
        <Route path="/security" element={<SecurityTrust />} />
        <Route path="/email-previews" element={<EmailPreviews />} />

        {/* QR Redirection */}
        <Route path="/q/:code" element={<QrRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global AI Chatbot & Navigation - Hidden on public forms */}
      {!isPublicForm && (
        <>
          <SnackzoAI />
          {user && <BottomNavigation />}
          <QuickCart hasBottomNav={!!user} />
          <LiveChat />
        </>
      )}
    </>
  );
};

import MaintenancePage from "./pages/MaintenancePage";
import { supabase } from "@/integrations/supabase/client";

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // Check Maintenance Mode
  useEffect(() => {
    const checkMaintenance = async () => {
      // 1. Get User Role
      const { data: { user } } = await supabase.auth.getUser();
      let adminStatus = false;

      if (user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        if (roles?.role === 'admin') adminStatus = true;
      }
      setIsAdmin(adminStatus);

      // 2. Check Feature Toggle
      const { data } = await supabase
        .from('feature_toggles')
        .select('is_enabled')
        .eq('feature_name', 'maintenance_mode')
        .single();

      if (data?.is_enabled) setMaintenanceMode(true);

      setCheckingMaintenance(false);
    };

    checkMaintenance();

    // Subscribe to toggle changes in real-time
    const channel = supabase
      .channel('maintenance-mode')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'feature_toggles', filter: "feature_name=eq.maintenance_mode" },
        (payload) => {
          setMaintenanceMode(payload.new.is_enabled);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Show offline page when no internet
  if (!isOnline) {
    return (
      <ThemeProvider defaultTheme="dark" storageKey="hostel-mart-theme">
        <OfflinePage />
      </ThemeProvider>
    );
  }

  // Show Maintenance Page (Bypass for Admins)
  if (!checkingMaintenance && maintenanceMode && !isAdmin) {
    // Allow access to admin login even in maintenance mode
    if (!window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/auth')) {
      return (
        <ThemeProvider defaultTheme="dark" storageKey="hostel-mart-theme">
          <MaintenancePage />
        </ThemeProvider>
      );
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="hostel-mart-theme">
          <AuthProvider>
            <FeatureProvider>
              <FavoritesProvider>
                <CartProvider>
                  <Toaster />
                  <Sonner />
                  <SocialProofToast />
                  <BrowserRouter>
                    <AuthTransition />
                    <AppRoutes />
                  </BrowserRouter>
                </CartProvider>
              </FavoritesProvider>
            </FeatureProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

