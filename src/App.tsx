import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
// import { FeatureProvider } from "@/contexts/FeatureContext"; // Temporarily disabled
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
import PaymentMethods from "./pages/PaymentMethods";
import Support from "./pages/Support";
import NotFound from "./pages/NotFound";
import OfflinePage from "./pages/OfflinePage";
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

const queryClient = new QueryClient();

import { ProtectedRoute } from "./components/ProtectedRoute";

const AppRoutes = () => {
  const location = useLocation();
  const { user } = useAuth();
  // Hide global navigation and chat widgets on public form viewer pages
  const isPublicForm = location.pathname.startsWith('/forms/');

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
        <Route path="/runner" element={<ProtectedRoute requireAdmin={true}><RunnerDashboard /></ProtectedRoute>} />

        {/* Semi-Public Routes */}
        <Route path="/products" element={<Products />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/forms/:formId" element={<FormViewerPage />} />

        {/* SnackzoPay Gateway */}
        <Route path="/pay" element={<ProtectedRoute><SnackzoPayGateway /></ProtectedRoute>} />
        <Route path="/pay/confirm" element={<ProtectedRoute><SnackzoPayConfirm /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Global AI Chatbot & Navigation - Hidden on public forms */}
      {!isPublicForm && (
        <>
          <SnackzoAI />
          {user && <BottomNavigation />}
          <LiveChat />
        </>
      )}
    </>
  );
};

const App = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="hostel-mart-theme">
          <AuthProvider>
            {/* FeatureProvider temporarily disabled until database is set up */}
            <FavoritesProvider>
              <CartProvider>
                <Toaster />
                <Sonner />
                <SocialProofToast />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </CartProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

