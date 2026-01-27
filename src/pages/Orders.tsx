import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Package,
  ChevronRight,
  RotateCcw,
  Truck,
  Bell,
  MapPin,
  Clock,
  CreditCard,
  Search,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  History,
  LayoutGrid,
  List,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { DeliveryEstimateBadge } from "@/components/DeliveryEstimate";
import { ReorderSuggestions } from "@/components/ReorderSuggestions";
import { Badge } from "@/components/ui/badge";
import { BottomNavigation } from "@/components/ui/BottomNavigation";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { OrderListSkeleton } from "@/components/ui/Skeletons";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string;
  runner_id?: string;
  is_express?: boolean;
}

const statusConfig: Record<string, { color: string; bg: string; icon: any; shadow: string }> = {
  placed: { color: "text-blue-400", bg: "bg-blue-500/10", icon: Package, shadow: "shadow-blue-500/20" },
  preparing: { color: "text-amber-400", bg: "bg-amber-500/10", icon: Sparkles, shadow: "shadow-amber-500/20" },
  packed: { color: "text-purple-400", bg: "bg-purple-500/10", icon: Package, shadow: "shadow-purple-500/20" },
  out_for_delivery: { color: "text-lime", bg: "bg-lime/10", icon: Truck, shadow: "shadow-lime/20" },
  delivered: { color: "text-cyan", bg: "bg-cyan/10", icon: History, shadow: "shadow-cyan/20" },
  cancelled: { color: "text-destructive", bg: "bg-destructive/10", icon: History, shadow: "shadow-destructive/20" }
};

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { requestPermission, showLocalNotification } = usePushNotifications();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchOrders();
    }
  }, [user, authLoading, navigate]);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setOrders(data);
    }
    setIsLoading(false);
  };

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await fetchOrders();
  }, []);

  const handleReorder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReorderingId(orderId);

    try {
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (itemsError || !items) {
        toast.error("Could not fetch order items");
        return;
      }

      let addedCount = 0;
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("*")
          .eq("id", item.product_id)
          .single();

        if (product && product.is_available && product.stock > 0) {
          addToCart({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image_url || "",
            stock: product.stock
          });
          addedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`${addedCount} items added to cart!`);
        navigate("/checkout");
      } else {
        toast.error("Items are currently unavailable");
      }
    } catch (error) {
      toast.error("Reorder failed");
    } finally {
      setReorderingId(null);
    }
  };

  const activeOrders = orders.filter(o => !["delivered", "cancelled"].includes(o.status));
  const pastOrders = orders.filter(o => ["delivered", "cancelled"].includes(o.status));
  const displayedOrders = activeTab === 'active' ? activeOrders : pastOrders;

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="container mx-auto px-4 pt-28 pb-8">
          <OrderListSkeleton count={4} />
        </main>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/30">
        <Navbar />

        <main className="container mx-auto px-4 pt-28 pb-8 max-w-2xl">
          {/* Header Section */}
          <div className="flex flex-col gap-6 mb-10">
            {/* Back Button */}
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground w-fit transition-colors"
            >
              <ArrowLeft size={18} />
              <span>Back</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-3xl font-bold tracking-tight"
                >
                  Your Orders
                </motion.h1>
                <p className="text-muted-foreground text-sm font-medium mt-1">Manage and track your deliveries</p>
              </div>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={requestPermission}
                  className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-primary transition-colors"
                >
                  <Bell size={18} />
                </motion.button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5">
              <button
                onClick={() => setActiveTab('active')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300",
                  activeTab === 'active'
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                Active ({activeOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('past')}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300",
                  activeTab === 'past'
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                History ({pastOrders.length})
              </button>
            </div>
          </div>

          {/* Orders List */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {displayedOrders.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package size={40} className="text-muted-foreground/30" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight mb-2">No {activeTab} orders</h2>
                  <p className="text-muted-foreground text-sm max-w-[200px] mx-auto mb-8">
                    Your {activeTab} order history will appear here.
                  </p>
                  <button
                    onClick={() => navigate("/products")}
                    className="bg-primary text-white px-8 py-3 rounded-2xl font-bold tracking-wide text-sm hover:scale-105 transition-all shadow-xl shadow-primary/20"
                  >
                    Start Ordering
                  </button>
                </div>
              ) : (
                displayedOrders.map((order, idx) => {
                  const config = statusConfig[order.status] || statusConfig.placed;
                  const StatusIcon = config.icon;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="group relative cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative glass-card p-5 rounded-[2rem] border border-white/5 hover:border-white/20 transition-all flex flex-col gap-4 overflow-hidden">

                        {/* Status Ribbon */}
                        {order.status === 'out_for_delivery' && (
                          <div className="absolute top-0 right-0 bg-lime text-black px-4 py-1 rounded-bl-2xl text-[10px] font-bold uppercase tracking-wider animate-pulse shadow-lg">
                            LIVE TRACKING
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", config.bg, config.color)}>
                              <StatusIcon size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border", config.bg, config.color, "border-white/5")}>
                                  {order.status.replace(/_/g, " ")}
                                </span>
                                {order.is_express && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-lime uppercase tracking-wider">
                                    <Sparkles size={10} fill="currentColor" /> Express
                                  </span>
                                )}
                              </div>
                              <h3 className="text-lg font-bold tracking-tight leading-none">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                  <Clock size={12} /> {new Date(order.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                <span className="text-xs font-bold text-foreground">₹{order.total}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary transition-colors text-muted-foreground group-hover:text-white">
                              <ChevronRight size={20} />
                            </div>
                          </div>
                        </div>

                        {/* Location Mini View */}
                        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                          <MapPin size={14} className="text-muted-foreground shrink-0" />
                          <p className="text-[11px] font-medium text-muted-foreground truncate">{order.delivery_address}</p>
                        </div>

                        {/* Action Buttons */}
                        {activeTab === 'past' && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleReorder(order.id, e)}
                              disabled={reorderingId === order.id}
                              className="flex-1 py-3 px-4 bg-white/5 hover:bg-primary hover:text-white rounded-xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all border border-white/5"
                            >
                              <RotateCcw size={14} className={reorderingId === order.id ? "animate-spin" : ""} />
                              {reorderingId === order.id ? "Adding..." : "Reorder"}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/receipt/${order.id}`);
                              }}
                              className="w-14 h-11 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center justify-center transition-all border border-white/5"
                            >
                              INV
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/support`);
                              }}
                              className="w-11 h-11 bg-white/5 hover:bg-white/10 rounded-xl text-muted-foreground flex items-center justify-center transition-all border border-white/5"
                            >
                              <HelpCircle size={18} />
                            </button>
                          </div>
                        )}

                        {activeTab === 'active' && (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/orders/${order.id}`);
                              }}
                              className="flex-1 py-3.5 px-4 bg-primary text-white rounded-2xl text-xs font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20"
                            >
                              <TrendingUp size={14} />
                              View Live Tracking
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}

              {/* Suggestions */}
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Recommended for you</h3>
                  <div className="w-10 h-1 rounded-full bg-white/5" />
                </div>
                <ReorderSuggestions limit={4} variant="vertical" />
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </PullToRefresh>
  );
};

export default Orders;
