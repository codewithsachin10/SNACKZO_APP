import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
// import { useFeatures } from "@/contexts/FeatureContext"; // Temporarily disabled
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, MapPin, CreditCard, Truck, QrCode, Wallet, Tag, X, Check, Coins, Clock, Zap, Shield, Smartphone, Building2 } from "lucide-react";
import { ExpressDeliveryBadge, ExpressDeliveryInfo } from "@/components/ExpressDeliveryBadge";
import { PaymentMethodSelector } from "@/components/PaymentMethodSelector";
import { SavedPaymentMethods } from "@/components/SavedPaymentMethods";
import { BNPLSelector } from "@/components/BNPLSelector";
import { notifyOrderConfirmed } from "@/utils/notificationService";
import OrderCelebration from "@/components/ui/OrderCelebration";
import AddressSelectorModal from "@/components/AddressSelectorModal";

// Premium Components
import { OrderScheduling } from "@/components/OrderScheduling";
import { CouponInput } from "@/components/FlashDeals";
import { BottomNavigation } from "@/components/ui/BottomNavigation";

interface Discount {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  valid_from?: string;
  valid_until?: string;
}

const Checkout = () => {
  const { user, profile } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  // Feature flags - default to enabled since FeatureProvider is disabled
  const isFeatureEnabled = (feature: string) => true;
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const [deliveryMode, setDeliveryMode] = useState<"room" | "common_area">("room");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "upi" | "netbanking" | "bnpl" | "cod" | "wallet" | "saved">("upi");
  const [selectedSavedMethod, setSelectedSavedMethod] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [oneClickCheckout, setOneClickCheckout] = useState(false);

  // Handle SnackzoPay Callback
  useEffect(() => {
    const status = searchParams.get("status");
    const txnId = searchParams.get("transaction_id");

    if (status === "success" && txnId) {
      // Payment success!
      // We need to trigger handlePlaceOrder with details
      // Note: We use a timeout to ensure state is hydrated if needed, though usually not needed
      const providerOrderId = searchParams.get("transaction_id") || `ord_${Date.now()}`;

      handlePlaceOrder({
        transaction_id: txnId,
        payment_status: 'paid',
        provider_order_id: providerOrderId
      });
    } else if (status === "failed") {
      toast.error("Payment failed. Please try again.");
    } else if (status === "cancelled") {
      toast.info("Payment cancelled");
    }
  }, [searchParams]);

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Celebration State
  const [showCelebration, setShowCelebration] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  // Discount state
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);

  // Wallet state
  const [useWallet, setUseWallet] = useState(false);

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringDays, setRecurringDays] = useState<string[]>([]);

  // Express delivery state
  const [isExpress, setIsExpress] = useState(false);
  const expressDeliveryFee = 20; // Extra fee for express delivery
  const expressDeliveryMinOrder = 100; // Minimum order for express

  const walletBalance = profile?.wallet_balance || 0;

  const baseDeliveryFee = deliveryMode === "room" ? 10 : 0;
  const deliveryFee = baseDeliveryFee + (isExpress ? expressDeliveryFee : 0);

  // Calculate discount amount
  const discountAmount = appliedDiscount
    ? appliedDiscount.discount_type === "percentage"
      ? Math.round((subtotal * appliedDiscount.discount_value) / 100)
      : Math.min(appliedDiscount.discount_value, subtotal)
    : 0;

  const subtotalAfterDiscount = subtotal + deliveryFee - discountAmount;

  // Calculate wallet deduction
  const walletDeduction = useWallet ? Math.min(walletBalance, subtotalAfterDiscount) : 0;

  const total = subtotalAfterDiscount - walletDeduction;

  const deliveryAddress = profile?.hostel_block
    ? `${profile.hostel_block}${profile.room_number ? `, ${profile.room_number}` : ''}`
    : "Please complete your profile";

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (items.length === 0 && !showCelebration) {
    navigate("/products");
    return null;
  }

  const validateDiscountCode = async () => {
    if (!discountCode.trim()) {
      toast.error("Enter a discount code");
      return;
    }

    setIsValidatingCode(true);

    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", discountCode.toUpperCase())
        .eq("is_active", true)
        .single();

      if (error || !data) {
        toast.error("Invalid or expired discount code");
        setIsValidatingCode(false);
        return;
      }

      // Check validity period
      const now = new Date();
      const validFrom = data.start_date ? new Date(data.start_date) : null;
      const validUntil = data.end_date ? new Date(data.end_date) : null;

      if ((validFrom && now < validFrom) || (validUntil && now > validUntil)) {
        toast.error("This discount code has expired");
        setIsValidatingCode(false);
        return;
      }

      // Check max uses
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        toast.error("This discount code has reached its usage limit");
        setIsValidatingCode(false);
        return;
      }

      // Check minimum order amount
      if (subtotal < (data.min_order_amount || 0)) {
        toast.error(`Minimum order of ₹${data.min_order_amount} required`);
        setIsValidatingCode(false);
        return;
      }

      const discount: Discount = {
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount || 0,
        max_uses: data.usage_limit,
        used_count: data.usage_count,
        valid_from: data.start_date,
        valid_until: data.end_date
      };

      setAppliedDiscount(discount);
      toast.success(`Discount applied! ${discount.discount_type === "percentage" ? `${discount.discount_value}% OFF` : `₹${discount.discount_value} OFF`}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to validate code");
    } finally {
      setIsValidatingCode(false);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode("");
    toast.info("Discount removed");
  };

  const [gateway, setGateway] = useState<'snackzo' | 'razorpay'>('snackzo');

  // ... (existing functions)

  const handlePayment = async () => {
    if (!profile?.hostel_block || !profile?.room_number) {
      toast.error("Please complete your profile first");
      setIsAddressModalOpen(true);
      return;
    }

    // Validate scheduled order
    if (isScheduled && (!scheduledDate || !scheduledTime)) {
      toast.error("Please select a date and time for scheduled delivery");
      return;
    }

    // COD - Direct order placement
    if (paymentMethod === 'cod') {
      await handlePlaceOrder();
      return;
    }

    // Wallet - Check balance and proceed
    if (paymentMethod === 'wallet') {
      if (walletBalance < total) {
        toast.error("Insufficient wallet balance");
        return;
      }
      await handlePlaceOrder();
      return;
    }

    // One-click checkout with saved method
    if (paymentMethod === 'saved' && selectedSavedMethod) {
      // Saved methods currently default to SnackzoPay redirect logic for now
      await handleSnackzoPayment();
      return;
    }

    // Online Payment Handling
    if (gateway === 'snackzo') {
      await handleSnackzoPayment();
    } else {
      await handleRazorpayPayment();
    }
  };

  const handleSavedMethodPayment = async (savedMethod: any) => {
    // For now, treat saved methods as redirect to SnackzoPay (could be optimized later)
    await handleSnackzoPayment();
  };

  const handleSnackzoPayment = async () => {
    setIsProcessing(true);
    try {
      const tempOrderId = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const returnUrl = `${window.location.origin}/checkout`;
      const gatewayUrl = `${window.location.origin}/pay?amount=${total}&orderId=${tempOrderId}&returnUrl=${encodeURIComponent(returnUrl)}&merchant=Snackzo&phone=${profile?.phone || ""}`;

      window.location.href = gatewayUrl;
    } catch (err) {
      console.error("Payment redirect error:", err);
      toast.error("Failed to redirect to payment gateway");
      setIsProcessing(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      // 1. Create Order via Edge Function
      const { data: orderData, error } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: total,
          method: paymentMethod === 'card' ? 'card' : paymentMethod === 'netbanking' ? 'netbanking' : 'upi'
        }
      });

      if (error) {
        console.error("Function error:", error);
        throw new Error('Failed to create order on server');
      }

      // 2. Initialize Razorpay with enhanced options
      const options: any = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_YOUR_KEY_ID",
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: "SNACKZO",
        description: `Order for ${items.length} item${items.length > 1 ? 's' : ''}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          // 3. On Success, Place Order in DB
          await handlePlaceOrder({
            transaction_id: response.razorpay_payment_id,
            payment_status: 'paid',
            provider_order_id: response.razorpay_order_id
          });
        },
        prefill: {
          name: profile?.full_name || "",
          email: user?.email || "",
          contact: profile?.phone || "",
        },
        theme: {
          color: "#3b82f6" // Blue for Razorpay
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            toast("Payment cancelled");
          }
        },
        method: {
          card: paymentMethod === 'card',
          upi: paymentMethod === 'upi',
          netbanking: paymentMethod === 'netbanking',
          wallet: false,
        }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.success', async (response: any) => {
        await handlePlaceOrder({
          transaction_id: response.razorpay_payment_id,
          payment_status: 'paid',
          provider_order_id: response.razorpay_order_id
        });
      });

      rzp1.on('payment.error', (error: any) => {
        console.error("Payment error:", error);
        toast.error(error.description || 'Payment failed');
        setIsProcessing(false);
      });

      rzp1.open();

    } catch (err: any) {
      console.error("Payment Error:", err);
      toast.error(err.message || 'Payment initialization failed');
      setIsProcessing(false);
    }
  };

  async function handlePlaceOrder(paymentDetails?: { transaction_id: string, payment_status: string, provider_order_id: string, saved_method_id?: string }) {
    setIsProcessing(true);

    try {
      // Build scheduled_for timestamp if scheduling
      let scheduledFor = null;
      if (isScheduled && scheduledDate && scheduledTime) {
        scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      // Map payment method to database enum
      const dbPaymentMethod = paymentMethod === 'saved' && selectedSavedMethod
        ? selectedSavedMethod.payment_type
        : paymentMethod === 'wallet'
          ? 'upi' // Wallet uses UPI enum for now
          : paymentMethod;

      // Build order payload
      const orderPayload: any = {
        user_id: user.id,
        payment_method: dbPaymentMethod as any,
        delivery_mode: deliveryMode,
        delivery_address: deliveryAddress,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        notes: notes || null,
        status: "placed",
        is_express: isExpress,
        // Add payment details if available
        transaction_id: paymentDetails?.transaction_id || null,
        payment_status: paymentDetails?.payment_status || (paymentMethod === 'cod' ? 'pending' : 'failed')
      };

      if (scheduledFor) {
        orderPayload.scheduled_for = scheduledFor;
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of items) {
        await supabase
          .from("products")
          .update({ stock: item.stock - item.quantity })
          .eq("id", item.id);
      }

      // Update discount usage if applied
      if (appliedDiscount) {
        await supabase
          .from("discounts" as any)
          .update({ used_count: appliedDiscount.used_count + 1 })
          .eq("id", appliedDiscount.id);
      }

      // Debit wallet if used
      if (walletDeduction > 0) {
        await supabase
          .from("wallet_transactions")
          .insert({
            user_id: user.id,
            amount: walletDeduction,
            transaction_type: "debit",
            description: `Payment for order #${order.id.slice(0, 8)}`,
            order_id: order.id
          });
      }

      // Create payment transaction record
      if (paymentDetails?.transaction_id) {
        await supabase
          .from("payment_transactions")
          .insert({
            order_id: order.id,
            user_id: user.id,
            amount: total,
            currency: 'INR',
            payment_method: dbPaymentMethod,
            payment_status: paymentDetails.payment_status,
            provider: 'razorpay',
            provider_transaction_id: paymentDetails.transaction_id,
            provider_order_id: paymentDetails.provider_order_id,
            saved_payment_method_id: selectedSavedMethod?.id || null,
            completed_at: new Date().toISOString()
          });
      }

      // Save payment method if one-click checkout is enabled
      if (oneClickCheckout && paymentDetails?.transaction_id && paymentMethod !== 'cod' && paymentMethod !== 'wallet') {
        try {
          const savedMethodData: any = {
            user_id: user.id,
            payment_type: dbPaymentMethod,
            provider: 'razorpay',
            is_default: !selectedSavedMethod,
            nickname: `${dbPaymentMethod === 'card' ? 'Card' : dbPaymentMethod.toUpperCase()} •••• ${paymentDetails.transaction_id.slice(-4)}`
          };

          const { error: saveError } = await supabase
            .from("saved_payment_methods")
            .insert(savedMethodData);

          if (!saveError) {
            toast.success("Payment method saved for faster checkout!");
          }
        } catch (err) {
          console.error("Error saving payment method:", err);
        }
      }
      if (oneClickCheckout && paymentDetails?.transaction_id && paymentMethod !== 'cod' && paymentMethod !== 'wallet') {
        try {
          // Note: In production, you'd extract card details from Razorpay's payment response
          // For now, we'll create a basic saved method entry
          const savedMethodData: any = {
            user_id: user.id,
            payment_type: dbPaymentMethod,
            provider: 'razorpay',
            is_default: !selectedSavedMethod, // Set as default if no saved methods exist
            nickname: `${dbPaymentMethod === 'card' ? 'Card' : dbPaymentMethod.toUpperCase()} •••• ${paymentDetails.transaction_id.slice(-4)}`
          };

          // If card payment, we'd extract card details from Razorpay response
          // This requires additional Razorpay API calls to get payment details

          const { error: saveError } = await supabase
            .from("saved_payment_methods")
            .insert(savedMethodData);

          if (!saveError) {
            toast.success("Payment method saved for faster checkout!");
          }
        } catch (err) {
          console.error("Error saving payment method:", err);
          // Don't fail the order if saving payment method fails
        }
      }

      // Create payment transaction record
      if (paymentDetails?.transaction_id) {
        await supabase
          .from("payment_transactions")
          .insert({
            order_id: order.id,
            user_id: user.id,
            amount: total,
            currency: 'INR',
            payment_method: dbPaymentMethod,
            payment_status: paymentDetails.payment_status,
            provider: 'razorpay',
            provider_transaction_id: paymentDetails.transaction_id,
            provider_order_id: paymentDetails.provider_order_id,
            saved_payment_method_id: selectedSavedMethod?.id || null,
            completed_at: new Date().toISOString()
          });
      }

      // Send Notifications (Email + WhatsApp + SMS) - Unified
      await notifyOrderConfirmed(
        user.email || "",
        profile?.phone || "",
        { id: order.id, total: total }
      );

      clearCart();
      toast.success("Order placed successfully!");

      // Trigger Celebration
      setCreatedOrderId(order.id);
      setShowCelebration(true);

    } catch (error) {
      console.error("Order error:", error);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };




  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary border-b-3 border-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="neu-btn bg-background p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold uppercase">Checkout</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <div className="neu-card bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold uppercase flex items-center gap-2">
                  <MapPin size={20} />
                  Delivery Address
                </h2>
                <button
                  onClick={() => setIsAddressModalOpen(true)}
                  className="text-primary text-sm font-bold hover:underline"
                >
                  CHANGE
                </button>
              </div>
              <div className="bg-secondary border-3 border-foreground p-4">
                <p className="font-bold">{profile?.full_name || "Customer"}</p>
                <p className="text-muted-foreground">{deliveryAddress}</p>
                {profile?.phone && (
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                )}
              </div>
            </div>

            {/* Delivery Mode */}
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase flex items-center gap-2 mb-4">
                <Truck size={20} />
                Delivery Mode
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeliveryMode("room")}
                  className={`neu-btn p-4 text-left ${deliveryMode === "room" ? "bg-primary text-primary-foreground" : "bg-background"}`}
                >
                  <span className="font-bold block">Doorstep Delivery</span>
                  <span className="text-sm opacity-80">+₹10 • Right to your door</span>
                </button>
                <button
                  onClick={() => setDeliveryMode("common_area")}
                  className={`neu-btn p-4 text-left ${deliveryMode === "common_area" ? "bg-lime" : "bg-background"}`}
                >
                  <span className="font-bold block">Self Pickup</span>
                  <span className="text-sm opacity-80">FREE • Pick up at store</span>
                </button>
              </div>
            </div>

            {/* Express Delivery Option */}
            {subtotal >= expressDeliveryMinOrder && !isScheduled && (
              <div className="neu-card bg-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-bold uppercase flex items-center gap-2">
                      <Zap size={20} className="text-lime" />
                      Express Delivery
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      10-minute delivery guarantee
                    </p>
                  </div>
                  <ExpressDeliveryBadge variant="compact" />
                </div>

                <div
                  onClick={() => {
                    if (!isExpress) {
                      setIsExpress(true);
                      toast.success("Express delivery enabled! Your order will arrive in 10 minutes or less.");
                    } else {
                      setIsExpress(false);
                    }
                  }}
                  className={`cursor-pointer border-3 p-4 flex items-center justify-between transition-all ${isExpress
                    ? "bg-lime/20 border-lime"
                    : "border-foreground bg-background hover:bg-secondary"
                    }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold">10-Minute Express Delivery</p>
                      {isExpress && (
                        <span className="px-2 py-0.5 bg-lime text-black text-xs font-black rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Get your order delivered in 10 minutes or less
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Extra fee: <span className="font-bold text-lime">+₹{expressDeliveryFee}</span>
                    </p>
                  </div>
                  <div className={`w-6 h-6 border-3 flex items-center justify-center ${isExpress ? "bg-lime border-lime" : "border-foreground"
                    }`}>
                    {isExpress && <Check size={16} />}
                  </div>
                </div>

                {isExpress && (
                  <div className="mt-3 p-3 bg-lime/10 border border-lime/30 rounded-lg">
                    <p className="text-xs font-bold text-lime">
                      ⚡ Your order will be prioritized and delivered within 10 minutes!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Order Scheduling - Enhanced */}
            {isFeatureEnabled('order_scheduling') ? (
              <OrderScheduling
                isScheduled={isScheduled}
                setIsScheduled={setIsScheduled}
                scheduledDate={scheduledDate}
                setScheduledDate={setScheduledDate}
                scheduledTime={scheduledTime}
                setScheduledTime={setScheduledTime}
                isRecurring={isRecurring}
                setIsRecurring={setIsRecurring}
              />
            ) : (
              /* Legacy Scheduling */
              <div className="neu-card bg-card p-6">
                <h2 className="font-bold uppercase flex items-center gap-2 mb-4">
                  <Clock size={20} />
                  Delivery Time
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setIsScheduled(false)}
                      className={`neu-btn p-4 text-left ${!isScheduled ? "bg-primary text-primary-foreground" : "bg-background"}`}
                    >
                      <span className="font-bold block">Deliver Now</span>
                      <span className="text-sm opacity-80">ASAP • 15-30 mins</span>
                    </button>
                    <button
                      onClick={() => setIsScheduled(true)}
                      className={`neu-btn p-4 text-left ${isScheduled ? "bg-accent text-accent-foreground" : "bg-background"}`}
                    >
                      <span className="font-bold block">Schedule</span>
                      <span className="text-sm opacity-80">Choose date & time</span>
                    </button>
                  </div>

                  {isScheduled && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div>
                        <label className="text-sm font-medium mb-1 block">Date</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full glass-card p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">Time</label>
                        <select
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full glass-card p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">Select time</option>
                          <option value="08:00">8:00 AM</option>
                          <option value="09:00">9:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="12:00">12:00 PM</option>
                          <option value="13:00">1:00 PM</option>
                          <option value="14:00">2:00 PM</option>
                          <option value="15:00">3:00 PM</option>
                          <option value="16:00">4:00 PM</option>
                          <option value="17:00">5:00 PM</option>
                          <option value="18:00">6:00 PM</option>
                          <option value="19:00">7:00 PM</option>
                          <option value="20:00">8:00 PM</option>
                          <option value="21:00">9:00 PM</option>
                          <option value="22:00">10:00 PM</option>
                          <option value="23:00">11:00 PM</option>
                          <option value="00:00">12:00 AM</option>
                          <option value="01:00">1:00 AM</option>
                          <option value="02:00">2:00 AM</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discount Code */}
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase flex items-center gap-2 mb-4">
                <Tag size={20} />
                Discount Code
              </h2>

              {appliedDiscount ? (
                <div className="bg-lime/20 border-3 border-lime p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-lime">{appliedDiscount.code}</p>
                    <p className="text-sm text-muted-foreground">
                      {appliedDiscount.discount_type === "percentage"
                        ? `${appliedDiscount.discount_value}% OFF`
                        : `₹${appliedDiscount.discount_value} OFF`}
                    </p>
                  </div>
                  <button
                    onClick={removeDiscount}
                    className="p-2 bg-destructive/20 text-destructive rounded-lg hover:bg-destructive/30"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 border-3 border-foreground bg-background p-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                  />
                  <button
                    onClick={validateDiscountCode}
                    disabled={isValidatingCode}
                    className="neu-btn bg-primary text-primary-foreground px-6"
                  >
                    {isValidatingCode ? "..." : "Apply"}
                  </button>
                </div>
              )}
            </div>

            {/* Wallet Balance */}
            {walletBalance > 0 && (
              <div className="neu-card bg-card p-6">
                <h2 className="font-bold uppercase flex items-center gap-2 mb-4">
                  <Coins size={20} />
                  Wallet Balance
                </h2>
                <div
                  onClick={() => setUseWallet(!useWallet)}
                  className={`cursor-pointer border-3 p-4 flex items-center justify-between transition-colors ${useWallet
                    ? "bg-lime/20 border-lime"
                    : "border-foreground bg-background hover:bg-secondary"
                    }`}
                >
                  <div>
                    <p className="font-bold">Use Wallet Balance</p>
                    <p className="text-sm text-muted-foreground">
                      Available: <span className="text-lime font-bold">₹{walletBalance}</span>
                    </p>
                  </div>
                  <div className={`w-6 h-6 border-3 flex items-center justify-center ${useWallet ? "bg-lime border-lime" : "border-foreground"
                    }`}>
                    {useWallet && <Check size={16} />}
                  </div>
                </div>
                {useWallet && (
                  <p className="text-sm text-muted-foreground mt-2">
                    ₹{walletDeduction} will be deducted from your wallet
                    {total > 0 && `, remaining ₹${total} via ${paymentMethod === "upi" ? "UPI" : "Cash"}`}
                  </p>
                )}
              </div>
            )}

            {/* Enhanced Payment Method Selection */}
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase flex items-center gap-2 mb-4">
                <CreditCard size={20} />
                Payment Method
              </h2>



              {/* Saved Payment Methods Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold uppercase text-sm flex items-center gap-2">
                    <Zap size={16} className="text-lime" />
                    Quick Checkout
                  </h3>
                </div>

                <SavedPaymentMethods
                  onSelect={(method) => {
                    setSelectedSavedMethod(method);
                    setPaymentMethod('saved');
                  }}
                  selectedId={selectedSavedMethod?.id}
                  showAddButton={false}
                  onAddNew={() => { }}
                />

                {paymentMethod === 'saved' && selectedSavedMethod && (
                  <div className="mt-2 p-3 rounded-lg bg-lime/10 border border-lime/30 flex items-center gap-2">
                    <Check size={16} className="text-lime" />
                    <span className="text-sm font-bold text-lime">Using saved payment method</span>
                  </div>
                )}

                <div className="relative mt-4 mb-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">OR CHOOSE METHOD</span></div>
                </div>
              </div>

              {/* Grouped Payment Selection UI */}
              <div className="space-y-4">
                {/* 1. SnackzoPay */}
                <div className={`border-2 rounded-xl overflow-hidden transition-all ${gateway === 'snackzo' && ['card', 'upi', 'netbanking'].includes(paymentMethod) ? 'border-purple-500 bg-purple-500/5' : 'border-border bg-card'}`}>
                  <button
                    onClick={() => {
                      setGateway('snackzo');
                      setPaymentMethod('upi'); // Default sub-method
                      setSelectedSavedMethod(null);
                    }}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Zap size={20} /></div>
                      <div className="text-left">
                        <p className="font-bold">SnackzoPay</p>
                        <p className="text-xs text-muted-foreground">Credit/Debit Card, UPI, Netbanking</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gateway === 'snackzo' && ['card', 'upi', 'netbanking'].includes(paymentMethod) ? 'border-purple-500' : 'border-muted-foreground'}`}>
                      {gateway === 'snackzo' && ['card', 'upi', 'netbanking'].includes(paymentMethod) && <div className="w-2.5 h-2.5 bg-purple-500 rounded-full" />}
                    </div>
                  </button>

                  {/* Expanded Options */}
                  {gateway === 'snackzo' && ['card', 'upi', 'netbanking'].includes(paymentMethod) && (
                    <div className="px-4 pb-4 grid grid-cols-3 gap-2 animate-in slide-in-from-top-2">
                      {[
                        { id: 'upi', label: 'UPI', icon: Smartphone },
                        { id: 'card', label: 'Card', icon: CreditCard },
                        { id: 'netbanking', label: 'More', icon: Building2 }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setPaymentMethod(opt.id as any)}
                          className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${paymentMethod === opt.id ? 'bg-purple-500 text-white border-purple-500' : 'bg-background border-border hover:border-purple-500/50'}`}
                        >
                          <opt.icon size={16} />
                          <span className="text-xs font-bold">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Razorpay */}
                <div className={`border-2 rounded-xl overflow-hidden transition-all ${gateway === 'razorpay' && ['card', 'upi', 'netbanking'].includes(paymentMethod) ? 'border-blue-500 bg-blue-500/5' : 'border-border bg-card'}`}>
                  <button
                    onClick={() => {
                      setGateway('razorpay');
                      setPaymentMethod('netbanking');
                      setSelectedSavedMethod(null);
                    }}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Shield size={20} /></div>
                      <div className="text-left">
                        <p className="font-bold">Razorpay</p>
                        <p className="text-xs text-muted-foreground">Netbanking Only</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${gateway === 'razorpay' && ['card', 'upi', 'netbanking'].includes(paymentMethod) ? 'border-blue-500' : 'border-muted-foreground'}`}>
                      {gateway === 'razorpay' && ['card', 'upi', 'netbanking'].includes(paymentMethod) && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                    </div>
                  </button>
                  {/* Expanded Options */}
                  {gateway === 'razorpay' && ['card', 'upi', 'netbanking'].includes(paymentMethod) && (
                    <div className="px-4 pb-4 grid grid-cols-1 gap-2 animate-in slide-in-from-top-2">
                      {[
                        { id: 'netbanking', label: 'Netbanking (Access to all banks)', icon: Building2 }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setPaymentMethod(opt.id as any)}
                          className={`p-3 rounded-lg border flex items-center justify-center gap-2 transition-all ${paymentMethod === opt.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-background border-border hover:border-blue-500/50'}`}
                        >
                          <opt.icon size={16} />
                          <span className="text-sm font-bold">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Wallet */}
                {walletBalance > 0 && (
                  <div className={`border-2 rounded-xl overflow-hidden transition-all ${paymentMethod === 'wallet' ? 'border-lime bg-lime/10' : 'border-border bg-card'}`}>
                    <button
                      onClick={() => { setPaymentMethod('wallet'); setSelectedSavedMethod(null); }}
                      className="w-full p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-lime/20 text-lime-700 rounded-lg"><Coins size={20} /></div>
                        <div className="text-left">
                          <p className="font-bold">Wallet Balance</p>
                          <p className="text-xs text-muted-foreground">Available: ₹{walletBalance}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'wallet' ? 'border-lime' : 'border-muted-foreground'}`}>
                        {paymentMethod === 'wallet' && <div className="w-2.5 h-2.5 bg-lime rounded-full" />}
                      </div>
                    </button>
                  </div>
                )}

                {/* 4. Cash on Delivery */}
                <div className={`border-2 rounded-xl overflow-hidden transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
                  <button
                    onClick={() => { setPaymentMethod('cod'); setSelectedSavedMethod(null); }}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 text-primary rounded-lg"><Truck size={20} /></div>
                      <div className="text-left">
                        <p className="font-bold">Cash on Delivery</p>
                        <p className="text-xs text-muted-foreground">Pay when you receive</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === 'cod' ? 'border-primary' : 'border-muted-foreground'}`}>
                      {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* One-Click Checkout Toggle */}
              {selectedSavedMethod && (
                <div className="mt-4 p-3 bg-lime/10 border border-lime/30 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oneClickCheckout}
                      onChange={(e) => setOneClickCheckout(e.target.checked)}
                      className="w-4 h-4 rounded border-2 border-foreground checked:bg-lime"
                    />
                    <span className="text-sm font-bold flex items-center gap-1">
                      <Zap size={14} className="text-lime" />
                      Enable One-Click Checkout
                    </span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Save this payment method for faster checkout next time
                  </p>
                </div>
              )}

              {/* UPI QR Code (for UPI method) */}
              {showUpiQr && paymentMethod === "upi" && (
                <div className="mt-6 bg-secondary border-3 border-foreground p-6 text-center">
                  <div className="bg-background border-3 border-foreground p-4 inline-block mb-4">
                    <div className="w-48 h-48 bg-foreground/10 flex items-center justify-center">
                      <span className="text-6xl">📱</span>
                    </div>
                  </div>
                  <p className="font-bold uppercase text-sm">Scan to Pay ₹{total}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    UPI ID: hostelmart@upi
                  </p>
                </div>
              )}

              {/* BNPL Provider Selection */}
              {paymentMethod === "bnpl" && (
                <div className="mt-4">
                  <BNPLSelector
                    onSelect={(provider) => {
                      // Store selected BNPL provider
                      // This would be used when processing payment
                      toast.info(`${provider.name} selected. You'll complete payment with ${provider.name} at checkout.`);
                    }}
                    selectedProviderId={null}
                    orderAmount={total}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase mb-4">Order Notes (Optional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border-3 border-foreground bg-background p-3 font-medium focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                placeholder="Any special instructions? e.g., 'Leave at the door'"
              />
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <div className="neu-card bg-card p-6 sticky top-24">
              <h2 className="font-bold uppercase mb-4">Order Summary</h2>

              {/* Items */}
              <div className="space-y-3 mb-6 max-h-64 overflow-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-background border-3 border-foreground p-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover border-3 border-foreground"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm uppercase truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.price} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 border-t-3 border-foreground pt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span className={`font-bold ${deliveryFee === 0 ? "text-lime" : ""}`}>
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                  </span>
                </div>
                {isExpress && (
                  <div className="flex justify-between text-lime">
                    <span className="flex items-center gap-1">
                      <Zap size={14} />
                      Express Delivery
                    </span>
                    <span className="font-bold">+₹{expressDeliveryFee}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-lime">
                    <span className="flex items-center gap-1">
                      <Check size={14} />
                      Discount ({appliedDiscount?.code})
                    </span>
                    <span className="font-bold">-₹{discountAmount}</span>
                  </div>
                )}
                {walletDeduction > 0 && (
                  <div className="flex justify-between text-lime">
                    <span className="flex items-center gap-1">
                      <Coins size={14} />
                      Wallet
                    </span>
                    <span className="font-bold">-₹{walletDeduction}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl border-t-3 border-foreground pt-3 mt-3">
                  <span className="font-bold">To Pay</span>
                  <span className="font-bold">₹{total}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="neu-btn bg-lime w-full py-4 text-lg mt-6"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Processing...</span>
                ) : (
                  `Place Order • ₹${total}`
                )}
              </button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By placing this order, you agree to our terms of service
              </p>
            </div>
          </div>
        </div>

        <OrderCelebration
          show={showCelebration}
          type="placed"
          onComplete={() => {
            // Now navigate
            if (createdOrderId) {
              navigate(`/orders/${createdOrderId}`);
            } else {
              // Fallback if order creation happened but ID wasn't saved in state (logic below updates)
              navigate('/orders');
            }
          }}
        />

        <AddressSelectorModal
          isOpen={isAddressModalOpen}
          onClose={() => setIsAddressModalOpen(false)}
        />
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default Checkout;