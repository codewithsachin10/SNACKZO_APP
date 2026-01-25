import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
// import { FeatureProvider } from "@/contexts/FeatureContext"; // Temporarily disabled
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CompleteProfile from "./pages/CompleteProfile";
import Products from "./pages/Products";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
// import OrderTracking from "./pages/OrderTracking"; // Old tracking
import PremiumOrderTracking from "./pages/PremiumOrderTracking"; // Premium tracking
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

const queryClient = new QueryClient();

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
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/complete-profile" element={<CompleteProfile />} />
                    <Route path="/profile" element={<UserProfile />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:productId" element={<ProductDetail />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/orders/:orderId" element={<PremiumOrderTracking />} />
                    <Route path="/receipt/:orderId" element={<Receipt />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/runner" element={<RunnerDashboard />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/favorites" element={<Favorites />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/privacy-security" element={<PrivacySecurity />} />
                    <Route path="/settings/notifications" element={<NotificationSettings />} />
                    <Route path="/payment-methods" element={<PaymentMethods />} />
                    <Route path="/support" element={<Support />} />
                    {/* New Feature Routes */}
                    <Route path="/group-order" element={<GroupOrdering />} />
                    <Route path="/group-order/:groupId" element={<GroupOrdering />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/achievements" element={<Achievements />} />
                    <Route path="/group-checkout/:groupId" element={<GroupCheckout />} />
                    <Route path="/messages" element={<Messages />} />
                    {/* Premium Feature Routes - Temporarily disabled
                      <Route path="/spin" element={<SpinWheelPage />} />
                      <Route path="/flash-deals" element={<FlashDealsPage />} />
                      */}
                    {/* SnackzoPay Gateway */}
                    <Route path="/pay" element={<SnackzoPayGateway />} />
                    <Route path="/pay/confirm" element={<SnackzoPayConfirm />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  {/* Global AI Chatbot */}
                  <SnackzoAI />
                  {/* Premium Live Support */}
                  <LiveChat />
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

