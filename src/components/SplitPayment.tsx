import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wallet, CreditCard, Coins, ChevronDown, Check, AlertCircle, 
  Percent, Gift, Lock, Sparkles 
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface SplitPaymentProps {
  totalAmount: number;
  onPaymentMethodsChange: (methods: PaymentMethod[]) => void;
  walletBalance: number;
  loyaltyPoints: number;
  loyaltyPointsValue?: number; // 1 point = X rupees (default 0.1)
  appliedDiscount?: number;
  freeDeliveryEarned?: boolean;
}

interface PaymentMethod {
  type: "wallet" | "loyalty_points" | "upi" | "card" | "cod";
  amount: number;
  enabled: boolean;
}

export function SplitPayment({
  totalAmount,
  onPaymentMethodsChange,
  walletBalance,
  loyaltyPoints,
  loyaltyPointsValue = 0.1,
  appliedDiscount = 0,
  freeDeliveryEarned = false
}: SplitPaymentProps) {
  const [useWallet, setUseWallet] = useState(false);
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [walletAmount, setWalletAmount] = useState(0);
  const [loyaltyAmount, setLoyaltyAmount] = useState(0);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<"upi" | "card" | "cod">("upi");
  const [showBreakdown, setShowBreakdown] = useState(true);

  const maxLoyaltyValue = loyaltyPoints * loyaltyPointsValue;
  const amountAfterDiscount = totalAmount - appliedDiscount;

  // Calculate remaining amount after wallet and loyalty
  const walletDeduction = useWallet ? Math.min(walletAmount, amountAfterDiscount) : 0;
  const remainingAfterWallet = amountAfterDiscount - walletDeduction;
  const loyaltyDeduction = useLoyaltyPoints ? Math.min(loyaltyAmount, remainingAfterWallet) : 0;
  const finalAmount = remainingAfterWallet - loyaltyDeduction;

  // Update parent with payment methods
  useEffect(() => {
    const methods: PaymentMethod[] = [];
    
    if (walletDeduction > 0) {
      methods.push({ type: "wallet", amount: walletDeduction, enabled: true });
    }
    if (loyaltyDeduction > 0) {
      methods.push({ type: "loyalty_points", amount: loyaltyDeduction, enabled: true });
    }
    if (finalAmount > 0) {
      methods.push({ type: primaryPaymentMethod, amount: finalAmount, enabled: true });
    }
    
    onPaymentMethodsChange(methods);
  }, [walletDeduction, loyaltyDeduction, finalAmount, primaryPaymentMethod]);

  // Auto-adjust amounts when toggles change
  useEffect(() => {
    if (useWallet) {
      setWalletAmount(Math.min(walletBalance, amountAfterDiscount));
    } else {
      setWalletAmount(0);
    }
  }, [useWallet, walletBalance, amountAfterDiscount]);

  useEffect(() => {
    if (useLoyaltyPoints) {
      setLoyaltyAmount(Math.min(maxLoyaltyValue, remainingAfterWallet));
    } else {
      setLoyaltyAmount(0);
    }
  }, [useLoyaltyPoints, maxLoyaltyValue, remainingAfterWallet]);

  const paymentOptions = [
    { 
      id: "upi", 
      name: "UPI", 
      icon: "📱", 
      description: "Google Pay, PhonePe, etc.",
      instant: true 
    },
    { 
      id: "card", 
      name: "Credit/Debit Card", 
      icon: "💳", 
      description: "Visa, Mastercard, RuPay",
      instant: true 
    },
    { 
      id: "cod", 
      name: "Cash on Delivery", 
      icon: "💵", 
      description: "Pay when you receive",
      instant: false 
    }
  ];

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <CreditCard size={20} className="text-primary" />
          Payment Method
        </h3>
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-sm text-primary flex items-center gap-1"
        >
          {showBreakdown ? "Hide" : "Show"} breakdown
          <ChevronDown size={14} className={cn("transition-transform", showBreakdown && "rotate-180")} />
        </button>
      </div>

      {/* Wallet & Loyalty Points Options */}
      <div className="space-y-3">
        {/* Wallet Option */}
        {walletBalance > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-xl border-2 transition-all",
              useWallet ? "border-primary bg-primary/5" : "border-border bg-card"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  useWallet ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Wallet size={20} />
                </div>
                <div>
                  <div className="font-medium">Use Wallet Balance</div>
                  <div className="text-sm text-muted-foreground">
                    Available: ₹{walletBalance.toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setUseWallet(!useWallet)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  useWallet ? "bg-primary" : "bg-muted"
                )}
              >
                <motion.div
                  animate={{ x: useWallet ? 24 : 2 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>

            <AnimatePresence>
              {useWallet && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border">
                    <label className="text-sm font-medium mb-2 block">
                      Amount to use (max ₹{Math.min(walletBalance, amountAfterDiscount).toFixed(2)})
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max={Math.min(walletBalance, amountAfterDiscount)}
                        value={walletAmount}
                        onChange={(e) => setWalletAmount(parseFloat(e.target.value))}
                        className="flex-1 accent-primary"
                      />
                      <div className="w-20 px-3 py-2 bg-muted rounded-lg text-center font-medium">
                        ₹{walletAmount.toFixed(0)}
                      </div>
                    </div>
                    <div className="flex justify-between mt-2">
                      <button
                        onClick={() => setWalletAmount(Math.min(walletBalance, amountAfterDiscount))}
                        className="text-xs text-primary hover:underline"
                      >
                        Use maximum
                      </button>
                      <span className="text-xs text-muted-foreground">
                        Remaining wallet: ₹{(walletBalance - walletAmount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Loyalty Points Option */}
        {loyaltyPoints > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "p-4 rounded-xl border-2 transition-all",
              useLoyaltyPoints ? "border-yellow-500 bg-yellow-500/5" : "border-border bg-card"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  useLoyaltyPoints ? "bg-yellow-500 text-white" : "bg-muted"
                )}>
                  <Coins size={20} />
                </div>
                <div>
                  <div className="font-medium flex items-center gap-2">
                    Use Loyalty Points
                    <Sparkles size={14} className="text-yellow-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {loyaltyPoints} points = ₹{maxLoyaltyValue.toFixed(2)}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setUseLoyaltyPoints(!useLoyaltyPoints)}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  useLoyaltyPoints ? "bg-yellow-500" : "bg-muted"
                )}
              >
                <motion.div
                  animate={{ x: useLoyaltyPoints ? 24 : 2 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                />
              </button>
            </div>

            <AnimatePresence>
              {useLoyaltyPoints && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between text-sm">
                      <span>Points being used:</span>
                      <span className="font-bold text-yellow-600">
                        {Math.round(loyaltyAmount / loyaltyPointsValue)} points
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span>Value:</span>
                      <span className="font-bold text-green-600">-₹{loyaltyAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Primary Payment Method (for remaining amount) */}
      {finalAmount > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            Pay remaining ₹{finalAmount.toFixed(2)} via:
          </div>
          
          <div className="space-y-2">
            {paymentOptions.map((option) => (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setPrimaryPaymentMethod(option.id as any)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3",
                  primaryPaymentMethod === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <span className="text-2xl">{option.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium">{option.name}</div>
                  <div className="text-sm text-muted-foreground">{option.description}</div>
                </div>
                {option.instant && (
                  <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full">
                    Instant
                  </span>
                )}
                {primaryPaymentMethod === option.id && (
                  <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Payment Breakdown */}
      <AnimatePresence>
        {showBreakdown && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-muted/50 rounded-xl space-y-2">
              <div className="text-sm font-medium mb-3">Payment Breakdown</div>
              
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>₹{totalAmount.toFixed(2)}</span>
              </div>
              
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Percent size={12} /> Discount
                  </span>
                  <span>-₹{appliedDiscount.toFixed(2)}</span>
                </div>
              )}
              
              {freeDeliveryEarned && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Gift size={12} /> Free Delivery
                  </span>
                  <span>-₹10.00</span>
                </div>
              )}
              
              {walletDeduction > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span className="flex items-center gap-1">
                    <Wallet size={12} /> Wallet
                  </span>
                  <span>-₹{walletDeduction.toFixed(2)}</span>
                </div>
              )}
              
              {loyaltyDeduction > 0 && (
                <div className="flex justify-between text-sm text-yellow-600">
                  <span className="flex items-center gap-1">
                    <Coins size={12} /> Loyalty Points
                  </span>
                  <span>-₹{loyaltyDeduction.toFixed(2)}</span>
                </div>
              )}
              
              <div className="pt-2 mt-2 border-t border-border flex justify-between font-bold">
                <span>Amount to Pay</span>
                <span className="text-primary text-lg">₹{finalAmount.toFixed(2)}</span>
              </div>
              
              {finalAmount === 0 && (
                <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                  <Check size={16} />
                  <span>Fully covered by wallet & points!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock size={12} />
        <span>Your payment info is encrypted and secure</span>
      </div>
    </div>
  );
}

// ============================================
// MINI PAYMENT SELECTOR (For Checkout)
// ============================================

interface MiniPaymentSelectorProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  walletBalance?: number;
  useWallet?: boolean;
  onWalletToggle?: (use: boolean) => void;
}

export function MiniPaymentSelector({
  selectedMethod,
  onMethodChange,
  walletBalance = 0,
  useWallet = false,
  onWalletToggle
}: MiniPaymentSelectorProps) {
  const methods = [
    { id: "upi", icon: "📱", label: "UPI" },
    { id: "card", icon: "💳", label: "Card" },
    { id: "cod", icon: "💵", label: "COD" }
  ];

  return (
    <div className="space-y-3">
      {/* Main payment methods */}
      <div className="flex gap-2">
        {methods.map((method) => (
          <button
            key={method.id}
            onClick={() => onMethodChange(method.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 p-3 rounded-xl transition-all",
              selectedMethod === method.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            )}
          >
            <span className="text-xl">{method.icon}</span>
            <span className="text-xs font-medium">{method.label}</span>
          </button>
        ))}
      </div>

      {/* Wallet toggle */}
      {walletBalance > 0 && onWalletToggle && (
        <button
          onClick={() => onWalletToggle(!useWallet)}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
            useWallet ? "bg-primary/10 border-2 border-primary" : "bg-muted"
          )}
        >
          <div className="flex items-center gap-2">
            <Wallet size={18} className={useWallet ? "text-primary" : ""} />
            <span className="text-sm">
              Use wallet (₹{walletBalance})
            </span>
          </div>
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center",
            useWallet ? "border-primary bg-primary" : "border-muted-foreground"
          )}>
            {useWallet && <Check size={12} className="text-white" />}
          </div>
        </button>
      )}
    </div>
  );
}
