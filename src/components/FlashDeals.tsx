import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Clock, Tag, Copy, Check, AlertCircle, Gift, Percent, 
  Sparkles, Timer, X, ChevronRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FlashDeal {
  id: string;
  title: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  product_ids?: string[];
  category_ids?: string[];
  starts_at: string;
  ends_at: string;
  usage_limit?: number;
  used_count: number;
  is_active: boolean;
  promo_code?: string;
  image_url?: string;
}

interface Coupon {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_value: number;
  max_discount?: number;
  is_valid: boolean;
  expires_at: string;
  description: string;
}

interface FlashDealsProps {
  onApplyDeal?: (dealId: string, discount: number) => void;
  cartTotal?: number;
}

export function FlashDeals({ onApplyDeal, cartTotal = 0 }: FlashDealsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deals, setDeals] = useState<FlashDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimedDeals, setClaimedDeals] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<Record<string, number>>({});

  useEffect(() => {
    checkFeatureEnabled();
  }, []);

  // Update countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimeLeft: Record<string, number> = {};
      deals.forEach(deal => {
        const endTime = new Date(deal.ends_at).getTime();
        const remaining = Math.max(0, endTime - Date.now());
        newTimeLeft[deal.id] = remaining;
      });
      setTimeLeft(newTimeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [deals]);

  const checkFeatureEnabled = async () => {
    try {
      const { data, error } = await (supabase.from as any)("feature_toggles")
        .select("is_enabled")
        .eq("feature_name", "flash_deals")
        .single();
      
      // Default to enabled if error or no data
      if (error || !data || data.is_enabled !== false) {
        fetchDeals();
      } else {
        setIsLoading(false);
      }
    } catch {
      // Default to enabled on error
      fetchDeals();
    }
  };

  const fetchDeals = async () => {
    setIsLoading(true);
    const now = new Date().toISOString();
    
    const { data, error } = await (supabase.from as any)("flash_deals")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", now)
      .gte("ends_at", now)
      .order("discount_value", { ascending: false });

    if (!error && data) {
      setDeals(data);
      
      // Check which deals user has claimed
      if (user) {
        const { data: claims } = await (supabase.from as any)("flash_deal_claims")
          .select("deal_id")
          .eq("user_id", user.id);
        
        if (claims) {
          setClaimedDeals(new Set(claims.map((c: any) => c.deal_id)));
        }
      }
    }
    setIsLoading(false);
  };

  const claimDeal = async (deal: FlashDeal) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to claim this deal",
        variant: "destructive"
      });
      return;
    }

    if (deal.min_order_value > cartTotal) {
      toast({
        title: "Minimum order not met",
        description: `Add ₹${(deal.min_order_value - cartTotal).toFixed(2)} more to use this deal`,
        variant: "destructive"
      });
      return;
    }

    const { error } = await (supabase.from as any)("flash_deal_claims").insert({
      user_id: user.id,
      deal_id: deal.id
    });

    if (!error) {
      setClaimedDeals(new Set([...claimedDeals, deal.id]));
      
      // Calculate discount
      let discount = deal.discount_type === "percentage"
        ? (cartTotal * deal.discount_value) / 100
        : deal.discount_value;
      
      if (deal.max_discount) {
        discount = Math.min(discount, deal.max_discount);
      }
      
      onApplyDeal?.(deal.id, discount);
      
      // Haptic feedback
      if ("vibrate" in navigator) {
        navigator.vibrate([50, 30, 50]);
      }

      toast({
        title: "Deal Applied! 🎉",
        description: `You saved ₹${discount.toFixed(2)}`,
      });
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Zap className="text-yellow-500" size={24} />
        <h2 className="font-bold text-lg">Flash Deals</h2>
        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
          LIVE
        </span>
      </div>

      {/* Deals list */}
      <div className="space-y-3">
        {deals.map((deal, index) => {
          const remaining = timeLeft[deal.id] || 0;
          const isClaimed = claimedDeals.has(deal.id);
          const isExpiringSoon = remaining < 60 * 60 * 1000; // Less than 1 hour
          const meetsMinimum = cartTotal >= deal.min_order_value;

          return (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative overflow-hidden rounded-xl border-2 transition-all",
                isClaimed
                  ? "border-green-500 bg-green-500/5"
                  : isExpiringSoon
                  ? "border-red-500/50 bg-red-500/5"
                  : "border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
              )}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `repeating-linear-gradient(
                    45deg,
                    transparent,
                    transparent 10px,
                    currentColor 10px,
                    currentColor 11px
                  )`
                }} />
              </div>

              <div className="relative p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Deal badge */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
                        deal.discount_type === "percentage"
                          ? "bg-yellow-500 text-yellow-950"
                          : "bg-green-500 text-white"
                      )}>
                        {deal.discount_type === "percentage" ? (
                          <>{deal.discount_value}% OFF</>
                        ) : (
                          <>₹{deal.discount_value} OFF</>
                        )}
                      </span>
                      
                      {/* Timer */}
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
                        isExpiringSoon
                          ? "bg-red-500/10 text-red-500"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <Timer size={10} />
                        {formatTime(remaining)}
                      </span>
                    </div>

                    <h3 className="font-semibold">{deal.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {deal.description}
                    </p>

                    {/* Conditions */}
                    {deal.min_order_value > 0 && (
                      <p className={cn(
                        "text-xs mt-2",
                        meetsMinimum ? "text-green-600" : "text-muted-foreground"
                      )}>
                        {meetsMinimum ? (
                          <Check size={12} className="inline mr-1" />
                        ) : (
                          <AlertCircle size={12} className="inline mr-1" />
                        )}
                        Min. order: ₹{deal.min_order_value}
                        {!meetsMinimum && ` (Add ₹${(deal.min_order_value - cartTotal).toFixed(0)} more)`}
                      </p>
                    )}
                  </div>

                  {/* Claim button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => claimDeal(deal)}
                    disabled={isClaimed || !meetsMinimum}
                    className={cn(
                      "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                      isClaimed
                        ? "bg-green-500 text-white"
                        : meetsMinimum
                        ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-400"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isClaimed ? (
                      <span className="flex items-center gap-1">
                        <Check size={14} /> Applied
                      </span>
                    ) : (
                      "Claim"
                    )}
                  </motion.button>
                </div>

                {/* Promo code (if any) */}
                {deal.promo_code && !isClaimed && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <CopyableCode code={deal.promo_code} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// COUPON INPUT COMPONENT
// ============================================

interface CouponInputProps {
  onApply?: (code: string, discount: number) => void;
  cartTotal?: number;
}

export function CouponInput({ onApply, cartTotal = 0 }: CouponInputProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const { toast } = useToast();

  const validateCoupon = async () => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    setError(null);

    // Simulate API call - replace with actual coupon validation
    const { data, error } = await (supabase.from as any)("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    setIsLoading(false);

    if (error || !data) {
      setError("Invalid coupon code");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setError("This coupon has expired");
      return;
    }

    if (data.min_order_value > cartTotal) {
      setError(`Minimum order ₹${data.min_order_value} required`);
      return;
    }

    // Calculate discount
    let discount = data.discount_type === "percentage"
      ? (cartTotal * data.discount_value) / 100
      : data.discount_value;
    
    if (data.max_discount) {
      discount = Math.min(discount, data.max_discount);
    }

    setAppliedCoupon(data);
    onApply?.(code, discount);

    toast({
      title: "Coupon Applied! 🎉",
      description: `You saved ₹${discount.toFixed(2)}`,
    });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCode("");
    onApply?.("", 0);
  };

  if (appliedCoupon) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Tag size={14} className="text-white" />
          </div>
          <div>
            <p className="font-medium text-green-700">{appliedCoupon.code}</p>
            <p className="text-xs text-green-600">{appliedCoupon.description}</p>
          </div>
        </div>
        <button
          onClick={removeCoupon}
          className="p-1 hover:bg-green-500/20 rounded-full transition-colors"
        >
          <X size={16} className="text-green-600" />
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter coupon code"
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border-none focus:ring-2 focus:ring-primary outline-none uppercase"
          />
        </div>
        <button
          onClick={validateCoupon}
          disabled={isLoading || !code.trim()}
          className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 transition-opacity"
        >
          {isLoading ? "..." : "Apply"}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// COPYABLE CODE COMPONENT
// ============================================

interface CopyableCodeProps {
  code: string;
}

function CopyableCode({ code }: CopyableCodeProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyCode}
      className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg w-full"
    >
      <span className="font-mono font-bold tracking-wider flex-1 text-left">{code}</span>
      {copied ? (
        <Check size={14} className="text-green-500" />
      ) : (
        <Copy size={14} className="text-muted-foreground" />
      )}
    </button>
  );
}

// ============================================
// FLASH DEALS BANNER (For Homepage)
// ============================================

interface FlashDealsBannerProps {
  onViewAll?: () => void;
}

export function FlashDealsBanner({ onViewAll }: FlashDealsBannerProps) {
  const [deal, setDeal] = useState<FlashDeal | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    fetchTopDeal();
  }, []);

  useEffect(() => {
    if (!deal) return;
    
    const interval = setInterval(() => {
      const endTime = new Date(deal.ends_at).getTime();
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [deal]);

  const fetchTopDeal = async () => {
    // Skip feature check - default to enabled
    const now = new Date().toISOString();
    try {
      const { data } = await (supabase.from as any)("flash_deals")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("discount_value", { ascending: false })
        .limit(1)
        .single();

      if (data) {
        setDeal(data);
      }
    } catch {
      // Silently fail
    }
  };

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return { hours, minutes, seconds };
  };

  if (!deal) return null;

  const { hours, minutes, seconds } = formatTime(timeLeft);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 p-4"
    >
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 2,
              delay: i * 0.2,
              repeat: Infinity
            }}
          />
        ))}
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap size={24} className="text-white" />
          </div>
          <div className="text-white">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">
                {deal.discount_type === "percentage" 
                  ? `${deal.discount_value}% OFF`
                  : `₹${deal.discount_value} OFF`
                }
              </span>
              <Sparkles size={16} />
            </div>
            <p className="text-white/80 text-sm">{deal.title}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/20 px-3 py-2 rounded-lg">
            <div className="text-center">
              <div className="text-white font-bold">{hours.toString().padStart(2, "0")}</div>
              <div className="text-white/60 text-[10px]">HRS</div>
            </div>
            <span className="text-white/60">:</span>
            <div className="text-center">
              <div className="text-white font-bold">{minutes.toString().padStart(2, "0")}</div>
              <div className="text-white/60 text-[10px]">MIN</div>
            </div>
            <span className="text-white/60">:</span>
            <div className="text-center">
              <div className="text-white font-bold">{seconds.toString().padStart(2, "0")}</div>
              <div className="text-white/60 text-[10px]">SEC</div>
            </div>
          </div>
          
          <button
            onClick={onViewAll}
            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
