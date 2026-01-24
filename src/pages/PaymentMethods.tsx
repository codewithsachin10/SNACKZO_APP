/**
 * Payment Methods Management Page
 * Users can view, add, and manage their saved payment methods
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, CreditCard, Shield, Trash2, Star, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SavedPaymentMethods } from "@/components/SavedPaymentMethods";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

interface SavedPaymentMethod {
  id: string;
  payment_type: 'card' | 'upi' | 'netbanking' | 'bnpl';
  provider?: string;
  card_last4?: string;
  card_brand?: string;
  card_expiry_month?: number;
  card_expiry_year?: number;
  upi_id?: string;
  bnpl_provider?: string;
  is_default: boolean;
  nickname?: string;
  created_at: string;
}

const PaymentMethods = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [oneClickEnabled, setOneClickEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch saved payment methods
      const { data: methodsData, error: methodsError } = await supabase
        .from("saved_payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (methodsError) throw methodsError;
      setMethods(methodsData || []);

      // Fetch one-click checkout setting
      const { data: profileData } = await supabase
        .from("profiles")
        .select("one_click_checkout_enabled")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setOneClickEnabled(profileData.one_click_checkout_enabled || false);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load payment methods");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOneClick = async (enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ one_click_checkout_enabled: enabled })
        .eq("user_id", user.id);

      if (error) throw error;
      
      setOneClickEnabled(enabled);
      toast.success(enabled ? "One-click checkout enabled" : "One-click checkout disabled");
    } catch (error) {
      console.error("Error updating one-click checkout:", error);
      toast.error("Failed to update setting");
    }
  };

  const handleAddNew = () => {
    // Navigate to checkout or show add payment modal
    toast.info("Add a payment method during checkout to save it");
    navigate("/products");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      
      <header className="sticky top-0 z-50 bg-secondary border-b-3 border-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="neu-btn bg-background p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold uppercase">Payment Methods</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* One-Click Checkout Toggle */}
        <div className="neu-card bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-lime/20">
                <Check size={20} className="text-lime" />
              </div>
              <div>
                <h3 className="font-bold text-lg">One-Click Checkout</h3>
                <p className="text-sm text-muted-foreground">
                  Enable faster checkout with saved payment methods
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={oneClickEnabled}
                onChange={(e) => handleToggleOneClick(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime"></div>
            </label>
          </div>
        </div>

        {/* Saved Payment Methods */}
        <div className="neu-card bg-card p-6">
          <h2 className="font-bold uppercase text-lg mb-4 flex items-center gap-2">
            <CreditCard size={20} />
            Saved Payment Methods
          </h2>
          
          <SavedPaymentMethods
            onSelect={() => {}}
            selectedId={null}
            showAddButton={true}
            onAddNew={handleAddNew}
          />
        </div>

        {/* Security Info */}
        <div className="neu-card bg-card p-6 border-lime/30">
          <div className="flex items-start gap-3">
            <Shield size={24} className="text-lime mt-1" />
            <div>
              <h3 className="font-bold text-lg mb-2">Secure Payment Storage</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-lime mt-1 shrink-0" />
                  <span>All payment details are encrypted and stored securely</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-lime mt-1 shrink-0" />
                  <span>PCI DSS compliant payment processing</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-lime mt-1 shrink-0" />
                  <span>Card details are tokenized - we never store full card numbers</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-lime mt-1 shrink-0" />
                  <span>You can remove saved methods anytime</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PaymentMethods;
