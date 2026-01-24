/**
 * Enhanced Payment Method Selector Component
 * Supports Cards, UPI, Net Banking, BNPL, and Saved Methods
 */

import { useState } from "react";
import { 
  CreditCard, 
  Smartphone, 
  Building2, 
  Clock, 
  Wallet, 
  ChevronRight,
  Shield,
  Zap,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { SavedPaymentMethods } from "./SavedPaymentMethods";

export type PaymentMethodType = 'card' | 'upi' | 'netbanking' | 'bnpl' | 'cod' | 'wallet' | 'saved';

interface SavedPaymentMethod {
  id: string;
  payment_type: 'card' | 'upi' | 'netbanking' | 'bnpl';
  card_last4?: string;
  card_brand?: string;
  upi_id?: string;
  bnpl_provider?: string;
  is_default: boolean;
  nickname?: string;
}

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethodType;
  selectedSavedMethodId?: string | null;
  onMethodChange: (method: PaymentMethodType) => void;
  onSavedMethodSelect?: (method: SavedPaymentMethod | null) => void;
  showSavedMethods?: boolean;
  showWallet?: boolean;
  showCOD?: boolean;
  total?: number;
}

export function PaymentMethodSelector({
  selectedMethod,
  selectedSavedMethodId,
  onMethodChange,
  onSavedMethodSelect,
  showSavedMethods = true,
  showWallet = true,
  showCOD = true,
  total
}: PaymentMethodSelectorProps) {
  const [showAddPayment, setShowAddPayment] = useState(false);

  const paymentOptions = [
    {
      id: 'card' as PaymentMethodType,
      name: 'Credit/Debit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, RuPay',
      color: 'from-blue-500 to-blue-600',
      available: true
    },
    {
      id: 'upi' as PaymentMethodType,
      name: 'UPI',
      icon: Smartphone,
      description: 'Google Pay, PhonePe, Paytm',
      color: 'from-green-500 to-green-600',
      available: true
    },
    {
      id: 'netbanking' as PaymentMethodType,
      name: 'Net Banking',
      icon: Building2,
      description: 'All major banks',
      color: 'from-purple-500 to-purple-600',
      available: true
    },
    {
      id: 'bnpl' as PaymentMethodType,
      name: 'Buy Now Pay Later',
      icon: Clock,
      description: 'Simpl, ZestMoney, LazyPay',
      color: 'from-orange-500 to-orange-600',
      available: true
    },
    ...(showWallet ? [{
      id: 'wallet' as PaymentMethodType,
      name: 'Wallet',
      icon: Wallet,
      description: 'Use wallet balance',
      color: 'from-yellow-500 to-yellow-600',
      available: true
    }] : []),
    ...(showCOD ? [{
      id: 'cod' as PaymentMethodType,
      name: 'Cash on Delivery',
      icon: Wallet,
      description: 'Pay when you receive',
      color: 'from-gray-500 to-gray-600',
      available: true
    }] : [])
  ];

  const handleMethodSelect = (methodId: PaymentMethodType) => {
    if (methodId === 'saved') {
      // Don't change if clicking saved methods section
      return;
    }
    onMethodChange(methodId);
    onSavedMethodSelect?.(null);
  };

  return (
    <div className="space-y-4">
      {/* Saved Payment Methods Section */}
      {showSavedMethods && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase text-sm flex items-center gap-2">
              <Zap size={16} className="text-lime" />
              Quick Checkout
            </h3>
            <span className="text-xs text-muted-foreground">One-click payment</span>
          </div>
          
          <SavedPaymentMethods
            onSelect={(method) => {
              onMethodChange('saved');
              onSavedMethodSelect?.(method);
            }}
            selectedId={selectedMethod === 'saved' ? selectedSavedMethodId : null}
            showAddButton={true}
            onAddNew={() => setShowAddPayment(true)}
          />

          {selectedMethod === 'saved' && selectedSavedMethodId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-lg bg-lime/10 border border-lime/30 flex items-center gap-2"
            >
              <Check size={16} className="text-lime" />
              <span className="text-sm font-bold text-lime">Using saved payment method</span>
            </motion.div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">OR</span>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Options */}
      <div className="space-y-2">
        <h3 className="font-bold uppercase text-sm flex items-center gap-2">
          <CreditCard size={16} />
          Payment Methods
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {paymentOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedMethod === option.id && selectedMethod !== 'saved';
            
            return (
              <motion.button
                key={option.id}
                onClick={() => handleMethodSelect(option.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-lime bg-lime/10 shadow-lg shadow-lime/20"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={cn(
                    "p-2 rounded-lg bg-gradient-to-br",
                    isSelected ? option.color : "bg-muted"
                  )}>
                    <Icon size={20} className="text-white" />
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-lime flex items-center justify-center">
                      <Check size={12} className="text-black" />
                    </div>
                  )}
                </div>
                
                <p className="font-bold text-sm mb-1">{option.name}</p>
                <p className="text-xs text-muted-foreground">{option.description}</p>

                {/* BNPL Limit Badge */}
                {option.id === 'bnpl' && total && total > 1000 && (
                  <div className="mt-2 px-2 py-1 bg-orange-500/20 text-orange-500 text-xs font-bold rounded-full">
                    Up to ₹10,000
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Security Badge */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
        <Shield size={14} />
        <span>Secured by Razorpay • PCI DSS Compliant</span>
      </div>
    </div>
  );
}
