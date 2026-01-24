/**
 * Saved Payment Methods Component
 * Manages user's saved payment methods for one-click checkout
 */

import { useState, useEffect } from "react";
import { CreditCard, Trash2, Star, Plus, Shield, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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

interface SavedPaymentMethodsProps {
  onSelect?: (method: SavedPaymentMethod) => void;
  selectedId?: string | null;
  showAddButton?: boolean;
  onAddNew?: () => void;
}

export function SavedPaymentMethods({
  onSelect,
  selectedId,
  showAddButton = true,
  onAddNew
}: SavedPaymentMethodsProps) {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedMethods();
  }, []);

  const fetchSavedMethods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("saved_payment_methods")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMethods(data || []);
    } catch (error) {
      console.error("Error fetching saved methods:", error);
      toast.error("Failed to load saved payment methods");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc('set_default_payment_method', {
        p_user_id: user.id,
        p_payment_method_id: methodId
      });

      if (error) throw error;
      
      toast.success("Default payment method updated");
      fetchSavedMethods();
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Failed to update default payment method");
    }
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm("Are you sure you want to remove this payment method?")) return;

    setDeletingId(methodId);
    try {
      const { error } = await supabase
        .from("saved_payment_methods")
        .update({ is_active: false })
        .eq("id", methodId);

      if (error) throw error;
      
      toast.success("Payment method removed");
      fetchSavedMethods();
    } catch (error) {
      console.error("Error deleting method:", error);
      toast.error("Failed to remove payment method");
    } finally {
      setDeletingId(null);
    }
  };

  const getPaymentIcon = (method: SavedPaymentMethod) => {
    switch (method.payment_type) {
      case 'card':
        return '💳';
      case 'upi':
        return '📱';
      case 'netbanking':
        return '🏦';
      case 'bnpl':
        return '⏰';
      default:
        return '💳';
    }
  };

  const getPaymentLabel = (method: SavedPaymentMethod) => {
    if (method.nickname) return method.nickname;
    
    switch (method.payment_type) {
      case 'card':
        return `${method.card_brand?.toUpperCase() || 'Card'} •••• ${method.card_last4 || '****'}`;
      case 'upi':
        return method.upi_id || 'UPI';
      case 'netbanking':
        return 'Net Banking';
      case 'bnpl':
        return `${method.bnpl_provider || 'BNPL'}`;
      default:
        return 'Payment Method';
    }
  };

  const getExpiryText = (method: SavedPaymentMethod) => {
    if (method.payment_type === 'card' && method.card_expiry_month && method.card_expiry_year) {
      return `Expires ${method.card_expiry_month}/${method.card_expiry_year}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-16 bg-muted/50 rounded-xl animate-pulse" />
        <div className="h-16 bg-muted/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {methods.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CreditCard size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-bold">No saved payment methods</p>
          <p className="text-sm">Add a payment method for faster checkout</p>
        </div>
      ) : (
        <AnimatePresence>
          {methods.map((method) => (
            <motion.div
              key={method.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "relative rounded-xl border-2 p-4 transition-all cursor-pointer",
                selectedId === method.id
                  ? "border-lime bg-lime/10"
                  : "border-border bg-card hover:border-primary/50"
              )}
              onClick={() => onSelect?.(method)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-2xl">{getPaymentIcon(method)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{getPaymentLabel(method)}</p>
                      {method.is_default && (
                        <span className="px-2 py-0.5 bg-lime/20 text-lime text-xs font-bold rounded-full flex items-center gap-1">
                          <Star size={10} className="fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                    {getExpiryText(method) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {getExpiryText(method)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedId === method.id && (
                    <div className="w-6 h-6 rounded-full bg-lime flex items-center justify-center">
                      <Check size={14} className="text-black" />
                    </div>
                  )}
                  
                  {!method.is_default && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(method.id);
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                      title="Set as default"
                    >
                      <Star size={16} className="text-muted-foreground" />
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(method.id);
                    }}
                    disabled={deletingId === method.id}
                    className="p-2 rounded-lg hover:bg-destructive/20 transition-colors disabled:opacity-50"
                    title="Remove"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {showAddButton && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onAddNew}
          className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <Plus size={20} />
          <span className="font-bold">Add New Payment Method</span>
        </motion.button>
      )}

      {methods.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <Shield size={12} />
          <span>Your payment details are securely stored and encrypted</span>
        </div>
      )}
    </div>
  );
}
