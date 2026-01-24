import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell, BellOff, TrendingDown, AlertCircle, Check, Trash2, 
  ChevronDown, LineChart, Clock, ArrowDownRight 
} from "lucide-react";
import { format, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PriceAlert {
  id: string;
  product_id: string;
  target_price: number;
  is_triggered: boolean;
  created_at: string;
  product?: {
    name: string;
    price: number;
    image_url: string;
  };
}

interface PriceHistory {
  price: number;
  changed_at: string;
}

interface PriceAlertsProps {
  productId?: string;
  productName?: string;
  currentPrice?: number;
}

export function PriceAlerts({ productId, productName, currentPrice }: PriceAlertsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    checkFeatureEnabled();
  }, []);

  useEffect(() => {
    if (user && featureEnabled) {
      if (productId) {
        fetchProductAlerts();
        fetchPriceHistory();
      } else {
        fetchAllAlerts();
      }
    }
  }, [user, productId, featureEnabled]);

  const checkFeatureEnabled = async () => {
    try {
      const { data, error } = await (supabase.from as any)("feature_toggles")
        .select("is_enabled")
        .eq("feature_name", "price_alerts")
        .single();
      
      // Default to enabled if error or no data
      setFeatureEnabled(error ? true : (data?.is_enabled !== false));
    } catch {
      // Default to enabled on error
      setFeatureEnabled(true);
    }
    setIsLoading(false);
  };

  const fetchProductAlerts = async () => {
    const { data } = await (supabase.from as any)("price_alerts")
      .select("*")
      .eq("user_id", user?.id)
      .eq("product_id", productId);
    
    if (data) setAlerts(data);
  };

  const fetchAllAlerts = async () => {
    setIsLoading(true);
    const { data } = await (supabase.from as any)("price_alerts")
      .select(`
        *,
        product:products(name, price, image_url)
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });
    
    if (data) setAlerts(data);
    setIsLoading(false);
  };

  const fetchPriceHistory = async () => {
    if (!productId) return;
    
    const { data } = await (supabase.from as any)("price_history")
      .select("price, changed_at")
      .eq("product_id", productId)
      .order("changed_at", { ascending: true });
    
    if (data) setPriceHistory(data);
  };

  const createAlert = async () => {
    if (!user || !productId || !targetPrice) return;

    const target = parseFloat(targetPrice);
    if (isNaN(target) || target <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid target price",
        variant: "destructive"
      });
      return;
    }

    if (currentPrice && target >= currentPrice) {
      toast({
        title: "Invalid target",
        description: "Target price should be less than current price",
        variant: "destructive"
      });
      return;
    }

    const { error } = await (supabase.from as any)("price_alerts").insert({
      user_id: user.id,
      product_id: productId,
      target_price: target
    });

    if (!error) {
      fetchProductAlerts();
      setShowCreateForm(false);
      setTargetPrice("");
      toast({
        title: "Alert created! 🔔",
        description: `We'll notify you when price drops to ₹${target}`
      });
    }
  };

  const deleteAlert = async (alertId: string) => {
    await (supabase.from as any)("price_alerts")
      .delete()
      .eq("id", alertId);
    
    setAlerts(alerts.filter(a => a.id !== alertId));
    toast({
      title: "Alert removed",
      description: "Price alert has been deleted"
    });
  };

  if (!featureEnabled) {
    return null;
  }

  // Single product view
  if (productId) {
    const hasAlert = alerts.length > 0;
    const lowestPrice = priceHistory.length > 0 
      ? Math.min(...priceHistory.map(p => p.price))
      : currentPrice;
    const priceDropPercent = currentPrice && lowestPrice
      ? Math.round(((currentPrice - lowestPrice) / currentPrice) * 100)
      : 0;

    return (
      <div className="space-y-4">
        {/* Price Alert Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center",
              hasAlert ? "bg-primary/10" : "bg-muted"
            )}>
              {hasAlert ? (
                <Bell size={20} className="text-primary" />
              ) : (
                <BellOff size={20} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {hasAlert ? "Price alert active" : "Get price drop alerts"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasAlert 
                  ? `Watching for ₹${alerts[0].target_price}`
                  : "Be notified when price drops"
                }
              </p>
            </div>
          </div>
          
          {hasAlert ? (
            <button
              onClick={() => deleteAlert(alerts[0].id)}
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
            </button>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Set Alert
            </button>
          )}
        </div>

        {/* Create Alert Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Alert me when price drops to:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                      <input
                        type="number"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder={currentPrice ? Math.round(currentPrice * 0.9).toString() : "Target price"}
                        className="w-full pl-7 pr-4 py-2.5 bg-background rounded-lg border-none focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                    <button
                      onClick={createAlert}
                      className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2.5 bg-muted rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                {/* Suggested targets */}
                {currentPrice && (
                  <div className="flex flex-wrap gap-2">
                    {[5, 10, 15, 20].map((percent) => (
                      <button
                        key={percent}
                        onClick={() => setTargetPrice(Math.round(currentPrice * (1 - percent / 100)).toString())}
                        className="px-3 py-1 bg-background rounded-full text-sm hover:bg-primary/10 transition-colors"
                      >
                        {percent}% off (₹{Math.round(currentPrice * (1 - percent / 100))})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Price History Chart */}
        {priceHistory.length > 1 && (
          <InternalPriceChart 
            history={priceHistory} 
            currentPrice={currentPrice || 0}
          />
        )}

        {/* Price stats */}
        {lowestPrice && currentPrice && lowestPrice < currentPrice && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
            <ArrowDownRight size={16} className="text-green-600" />
            <span className="text-sm text-green-600">
              Lowest price was ₹{lowestPrice} ({priceDropPercent}% less)
            </span>
          </div>
        )}
      </div>
    );
  }

  // All alerts view
  return (
    <div className="space-y-4">
      <h2 className="font-bold text-lg flex items-center gap-2">
        <Bell size={20} className="text-primary" />
        Price Alerts
      </h2>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-8">
          <BellOff size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="font-medium">No price alerts</p>
          <p className="text-sm text-muted-foreground">
            Watch products to get notified when prices drop
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                alert.is_triggered
                  ? "bg-green-500/10 border-2 border-green-500"
                  : "bg-muted/50"
              )}
            >
              {/* Product image */}
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                {alert.product?.image_url ? (
                  <img 
                    src={alert.product.image_url} 
                    alt={alert.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {alert.product?.name || "Product"}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Target: ₹{alert.target_price}
                  </span>
                  {alert.product?.price && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className={alert.product.price <= alert.target_price ? "text-green-600" : ""}>
                        Now: ₹{alert.product.price}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              {alert.is_triggered ? (
                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                  Price dropped!
                </span>
              ) : (
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// PRICE HISTORY CHART
// ============================================

interface InternalPriceChartProps {
  history: PriceHistory[];
  currentPrice: number;
}

function InternalPriceChart({ history, currentPrice }: InternalPriceChartProps) {
  const [showChart, setShowChart] = useState(false);

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices, currentPrice);
  const range = maxPrice - minPrice || 1;

  // Normalize prices to 0-100 for chart
  const normalizedPrices = prices.map(p => ((p - minPrice) / range) * 100);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowChart(!showChart)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LineChart size={14} />
        Price History ({history.length} changes)
        <ChevronDown size={14} className={cn("transition-transform", showChart && "rotate-180")} />
      </button>

      <AnimatePresence>
        {showChart && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-muted/30 rounded-xl">
              {/* Chart */}
              <div className="h-32 relative">
                <svg className="w-full h-full" preserveAspectRatio="none">
                  {/* Grid lines */}
                  {[0, 25, 50, 75, 100].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={`${100 - y}%`}
                      x2="100%"
                      y2={`${100 - y}%`}
                      stroke="currentColor"
                      strokeOpacity={0.1}
                      strokeDasharray="4"
                    />
                  ))}

                  {/* Price line */}
                  <polyline
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    points={normalizedPrices.map((p, i) => 
                      `${(i / (normalizedPrices.length - 1)) * 100}%,${100 - p}%`
                    ).join(" ")}
                  />

                  {/* Area under line */}
                  <polygon
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    points={`0%,100% ${normalizedPrices.map((p, i) => 
                      `${(i / (normalizedPrices.length - 1)) * 100}%,${100 - p}%`
                    ).join(" ")} 100%,100%`}
                  />

                  {/* Data points */}
                  {normalizedPrices.map((p, i) => (
                    <circle
                      key={i}
                      cx={`${(i / (normalizedPrices.length - 1)) * 100}%`}
                      cy={`${100 - p}%`}
                      r="4"
                      fill="hsl(var(--primary))"
                    />
                  ))}
                </svg>

                {/* Price labels */}
                <div className="absolute top-0 right-0 text-xs text-muted-foreground">
                  ₹{maxPrice}
                </div>
                <div className="absolute bottom-0 right-0 text-xs text-muted-foreground">
                  ₹{minPrice}
                </div>
              </div>

              {/* Date labels */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{format(new Date(history[0].changed_at), "MMM d")}</span>
                <span>{format(new Date(history[history.length - 1].changed_at), "MMM d")}</span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Lowest</p>
                  <p className="font-bold text-green-600">₹{minPrice}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Current</p>
                  <p className="font-bold">₹{currentPrice}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Highest</p>
                  <p className="font-bold text-red-600">₹{maxPrice}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// PRICE DROP BADGE
// ============================================

interface PriceDropBadgeProps {
  productId?: string;
  currentPrice: number;
  originalPrice?: number;
}

export function PriceDropBadge({ productId, currentPrice, originalPrice }: PriceDropBadgeProps) {
  const [dropPercent, setDropPercent] = useState<number | null>(null);

  useEffect(() => {
    if (originalPrice && currentPrice < originalPrice) {
      setDropPercent(Math.round(((originalPrice - currentPrice) / originalPrice) * 100));
    } else if (productId) {
      // Fetch from price history
      fetchPriceHistory();
    }
  }, [productId, currentPrice, originalPrice]);

  const fetchPriceHistory = async () => {
    if (!productId) return;
    
    const { data } = await (supabase.from as any)("price_history")
      .select("price")
      .eq("product_id", productId)
      .order("changed_at", { ascending: false })
      .limit(10);
    
    if (data && data.length > 1) {
      const previousPrice = data[1]?.price;
      if (previousPrice && currentPrice < previousPrice) {
        setDropPercent(Math.round(((previousPrice - currentPrice) / previousPrice) * 100));
      }
    }
  };

  if (!dropPercent || dropPercent <= 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full"
    >
      <TrendingDown size={10} />
      {dropPercent}% OFF
    </motion.div>
  );
}

// ============================================
// PRICE ALERT BUTTON (Simple toggle for product pages)
// ============================================

interface PriceAlertButtonProps {
  productId: string;
  currentPrice: number;
}

export function PriceAlertButton({ productId, currentPrice }: PriceAlertButtonProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasAlert, setHasAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) checkExistingAlert();
  }, [user, productId]);

  const checkExistingAlert = async () => {
    const { data } = await (supabase.from as any)("price_alerts")
      .select("id")
      .eq("user_id", user?.id)
      .eq("product_id", productId)
      .single();
    
    setHasAlert(!!data);
  };

  const toggleAlert = async () => {
    if (!user) {
      toast({ title: "Please login", description: "You need to be logged in to set price alerts" });
      return;
    }

    setIsLoading(true);

    if (hasAlert) {
      // Remove alert
      await (supabase.from as any)("price_alerts")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);
      
      setHasAlert(false);
      toast({ title: "Alert removed", description: "You won't be notified about price drops" });
    } else {
      // Create alert at 10% below current price
      const targetPrice = Math.floor(currentPrice * 0.9);
      
      await (supabase.from as any)("price_alerts")
        .insert({
          user_id: user.id,
          product_id: productId,
          target_price: targetPrice
        });
      
      setHasAlert(true);
      toast({ 
        title: "🔔 Price alert set!", 
        description: `We'll notify you when price drops below ₹${targetPrice}` 
      });
    }

    setIsLoading(false);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleAlert}
      disabled={isLoading}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
        hasAlert 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted hover:bg-muted/80"
      )}
    >
      {hasAlert ? <BellOff size={18} /> : <Bell size={18} />}
      {isLoading ? "..." : hasAlert ? "Alert Set" : "Price Alert"}
    </motion.button>
  );
}

// ============================================
// PRICE HISTORY CHART (Standalone component)
// ============================================

interface PriceHistoryChartProps {
  productId: string;
}

export function PriceHistoryChart({ productId }: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [productId]);

  const fetchHistory = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
    
    const { data } = await (supabase.from as any)("price_history")
      .select("price, changed_at")
      .eq("product_id", productId)
      .gte("changed_at", thirtyDaysAgo)
      .order("changed_at", { ascending: true });
    
    if (data && data.length > 0) {
      setHistory(data);
    }
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="h-32 bg-muted/50 rounded-lg animate-pulse flex items-center justify-center">
        <LineChart className="text-muted-foreground" size={24} />
      </div>
    );
  }

  if (history.length < 2) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg text-center text-muted-foreground">
        <LineChart className="mx-auto mb-2" size={24} />
        <p className="text-sm">Not enough price history yet</p>
      </div>
    );
  }

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = prices[prices.length - 1];
  const priceRange = maxPrice - minPrice || 1;

  // Generate SVG path
  const width = 300;
  const height = 100;
  const padding = 10;
  
  const points = history.map((h, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((h.price - minPrice) / priceRange) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <LineChart size={16} />
          Price History (30 days)
        </h4>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24">
          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeOpacity={0.1} />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" strokeOpacity={0.1} />
          
          {/* Price line */}
          <polyline
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            points={points}
          />
          
          {/* Area fill */}
          <polygon
            fill="hsl(var(--primary))"
            fillOpacity={0.1}
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          />
        </svg>

        {/* Price labels */}
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>₹{minPrice}</span>
          <span className="font-medium text-foreground">₹{currentPrice}</span>
          <span>₹{maxPrice}</span>
        </div>
      </div>
    </div>
  );
}
