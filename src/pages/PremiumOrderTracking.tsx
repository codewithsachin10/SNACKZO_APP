import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Package,
  CheckCircle,
  Truck,
  Home,
  RefreshCw,
  MessageCircle,
  Phone,
  Share2,
  Bell,
  Copy,
  MapPin,
  Clock,
  Star,
  Zap,
  ChevronDown,
  ChevronUp,
  Camera,
  Gift,
  AlertTriangle,
  Send,
  Loader2,
  User,
  Bike,
  Navigation2,
  ShieldCheck,
  X,
  DollarSign,
  ThumbsUp,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Chat } from "@/components/Chat";
import OrderCelebration from "@/components/ui/OrderCelebration";
import { DeliveryCountdown } from "@/components/DeliveryCountdown";
import { calculateEnhancedETA as calculateETAUtil, ETAResult } from "@/utils/deliveryETA";
import { Badge } from "@/components/ui/badge";

// Import Premium Components
import {
  StatusTimeline,
  RunnerCard,
  DeliveryInstructions,
  OrderDetailsPanel,
  WeatherWidget,
  IssueReporting,
  DeliveryProofView,
  TipRunnerModal,
  PointsEarned,
  ShareOrder
} from "@/components/PremiumOrderTracking";

// Import Premium Map
import { PremiumLiveMap } from "@/components/PremiumMap";

// ============================================
// TYPES
// ============================================

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_id: string;
}

interface Order {
  id: string;
  status: "placed" | "preparing" | "packed" | "out_for_delivery" | "nearby" | "delivered" | "cancelled";
  payment_method: "upi" | "cod";
  delivery_mode: "room" | "common_area";
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  notes: string | null;
  created_at: string;
  runner_id: string | null;
  delivery_otp?: string;
  scheduled_for?: string;
  is_contactless?: boolean;
  delivery_instructions?: string;
  points_earned?: number;
}

interface Runner {
  id: string;
  name: string;
  phone: string;
  photo_url?: string;
  average_rating?: number;
  total_ratings?: number;
  total_deliveries?: number;
  vehicle_type?: string;
  vehicle_number?: string;
}

interface RunnerLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  updated_at: string;
}

interface StatusUpdate {
  status: string;
  timestamp: string;
  message?: string;
}

interface DeliveryProof {
  photo_url: string;
  signature_url?: string;
  received_by?: string;
  timestamp: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

const PremiumOrderTracking = () => {
  const { orderId } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // State
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [runner, setRunner] = useState<Runner | null>(null);
  const [runnerLocation, setRunnerLocation] = useState<RunnerLocation | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusUpdate[]>([]);
  const [deliveryProof, setDeliveryProof] = useState<DeliveryProof | null>(null);
  const [estimatedDelivery, setEstimatedDelivery] = useState<string | null>(null);
  const [etaResult, setEtaResult] = useState<ETAResult | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracking" | "details">("tracking");

  // ============================================
  // DATA FETCHING
  // ============================================

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth");
      return;
    }

    fetchOrderData();

    // 1. Order status subscription
    const orderChannel = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrder(newOrder);
          if (newOrder.status === "delivered") {
            setShowDelivered(true);
            fetchDeliveryProof(orderId!);
          }
          toast.success(`Status updated: ${newOrder.status.replace(/_/g, " ")}`);
          fetchStatusHistory(orderId!);
          updateEnhancedETA();
        }
      ).subscribe();

    const etaInterval = setInterval(async () => {
      if (order && order.status !== "delivered" && order.status !== "cancelled") {
        await updateEnhancedETA();
      }
    }, 30000);

    return () => {
      supabase.removeChannel(orderChannel);
      clearInterval(etaInterval);
    };
  }, [orderId, user, navigate]);

  // Separate effect for runner location to avoid re-subscribing to order status
  useEffect(() => {
    if (!order?.runner_id) return;

    const runnerLocationChannel = supabase.channel(`runner-location-${order.runner_id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "runner_locations",
        filter: `runner_id=eq.${order.runner_id}`
      },
        (payload) => {
          if (payload.new) setRunnerLocation(payload.new as RunnerLocation);
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(runnerLocationChannel);
    };
  }, [order?.runner_id]);

  const fetchOrderData = async () => {
    if (!orderId) return;

    try {
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        toast.error("Order not found");
        navigate("/orders");
        return;
      }

      setOrder(orderData);

      const { data: itemsData } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

      if (itemsData) setItems(itemsData);

      if (orderData.runner_id) {
        await fetchRunnerData(orderData.runner_id);
      }

      await fetchStatusHistory(orderId);

      if (orderData.status === "delivered") {
        await fetchDeliveryProof(orderId);
      }

      calculateETA(orderData);
      updateEnhancedETA();

    } catch (error) {
      toast.error("Failed to load order");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRunnerData = async (runnerId: string) => {
    const { data: runnerData } = await supabase
      .from("runners")
      .select("*")
      .eq("id", runnerId)
      .maybeSingle();

    if (runnerData) setRunner(runnerData);

    const { data: locationData } = await (supabase.from as any)("runner_locations")
      .select("*")
      .eq("runner_id", runnerId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (locationData) setRunnerLocation(locationData);
  };

  const fetchStatusHistory = async (orderId: string) => {
    const { data } = await (supabase.from as any)("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (data) {
      setStatusHistory(data.map((h: any) => ({
        status: h.status,
        timestamp: h.created_at,
        message: h.message
      })));
    }
  };

  const fetchDeliveryProof = async (orderId: string) => {
    const { data } = await (supabase.from as any)("delivery_proofs")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (data) {
      setDeliveryProof({
        photo_url: data.photo_url,
        signature_url: data.signature_url,
        received_by: data.received_by,
        timestamp: data.created_at
      });
    }
  };

  const calculateETA = (orderData: Order) => {
    if (orderData.status === "delivered" || orderData.status === "cancelled") {
      setEstimatedDelivery(null);
      setEtaResult(null);
      return;
    }
    const now = new Date();
    const eta = new Date(now.getTime() + 15 * 60000);
    setEstimatedDelivery(format(eta, "h:mm a"));
  };

  const updateEnhancedETA = async () => {
    if (!order || order.status === "delivered" || order.status === "cancelled") return;

    try {
      const eta = await calculateETAUtil({
        runnerId: order.runner_id,
        orderId: order.id,
        isExpress: (order as any).is_express || false
      });
      if (eta) {
        setEtaResult(eta);
        setEstimatedDelivery(format(eta.estimatedTime, "h:mm a"));
      }
    } catch (error) {
      console.error("ETA Update Error:", error);
    }
  };



  const handleReorder = async () => {
    for (const item of items) {
      const { data: product } = await supabase.from("products").select("*").eq("id", item.product_id).single();
      if (product && product.stock > 0) {
        addToCart({ id: product.id, name: product.name, price: product.price, image: product.image_url || "", stock: product.stock });
      }
    }
    toast.success("Items added to cart!");
    navigate("/checkout");
  };

  const handleCallRunner = () => { runner?.phone && (window.location.href = `tel:${runner.phone}`); };

  const handleUpdateInstructions = async (instructions: string) => {
    if (!orderId) return;
    await (supabase.from as any)("delivery_instructions").upsert({ order_id: orderId, instructions, updated_at: new Date().toISOString() });
    toast.success("Instructions updated!");
  };

  const handleToggleContactless = async (value: boolean) => {
    if (!orderId) return;
    await supabase.from("orders").update({ is_contactless: value }).eq("id", orderId);
    setOrder(prev => prev ? { ...prev, is_contactless: value } : null);
    toast.success(value ? "Contactless enabled" : "Contactless disabled");
  };

  const handleTip = async (amount: number) => {
    if (!order?.runner_id || !user) return;
    await (supabase.from as any)("runner_tips").insert({ order_id: order.id, runner_id: order.runner_id, user_id: user.id, amount, payment_status: "completed" });
    toast.success(`₹${amount} tip sent to ${runner?.name}!`);
  };

  const copyOTP = () => { if (order?.delivery_otp) { navigator.clipboard.writeText(order.delivery_otp); toast.success("OTP copied!"); } };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-bold tracking-tight uppercase animate-pulse text-muted-foreground">Connecting to Runner...</p>
      </div>
    );
  }

  if (!order) return null;

  if (showChat && runner) {
    return <Chat orderId={order.id} runnerName={runner.name} isModal={true} onClose={() => setShowChat(false)} />;
  }

  const isActiveDelivery = ["placed", "preparing", "packed", "out_for_delivery", "nearby"].includes(order.status);

  const statusConfigPage = {
    placed: { color: "from-blue-500/20 to-blue-600/20", glow: "shadow-blue-500/20", text: "Order Placed", icon: Package },
    preparing: { color: "from-amber-500/20 to-orange-500/20", glow: "shadow-amber-500/20", text: "Stirring Engines", icon: Zap },
    packed: { color: "from-purple-500/20 to-pink-500/20", glow: "shadow-purple-500/20", text: "Ready to Blast", icon: CheckCircle },
    out_for_delivery: { color: "from-lime/20 to-green-500/20", glow: "shadow-lime/20", text: "On Warp Speed", icon: Truck },
    nearby: { color: "from-cyan-500/20 to-blue-500/20", glow: "shadow-cyan-500/20", text: "Approaching Base", icon: MapPin },
    delivered: { color: "from-green-500/20 to-emerald-500/20", glow: "shadow-green-500/20", text: "Mission Success", icon: Home },
    cancelled: { color: "from-red-500/20 to-red-600/20", glow: "shadow-red-500/20", text: "Mission Aborted", icon: X },
  };

  const currentStatusConfig = statusConfigPage[order.status];
  const StatusIcon = currentStatusConfig.icon;

  return (
    <div className="min-h-screen bg-background text-foreground pb-40 selection:bg-primary/30 font-sans overflow-x-hidden">
      <header className="sticky top-0 z-50">
        <div className={cn("absolute inset-0 bg-gradient-to-b opacity-10 blur-3xl pointer-events-none transition-all duration-1000", currentStatusConfig.color)} />
        <div className="backdrop-blur-2xl bg-background/60 border-b border-white/5 px-4 pt-6 pb-4">
          <div className="container mx-auto max-w-2xl">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }} onClick={() => navigate("/orders")} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                  <ArrowLeft size={24} />
                </motion.button>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Order Tracking</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-0.5 bg-white/5 rounded-md border border-white/5">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{format(new Date(order.created_at), "h:mm a")}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ShareOrder orderId={order.id} items={items} />
              </div>
            </div>

            {/* Status Header Segment */}
            <div className={cn("p-5 rounded-[2.5rem] border border-white/10 transition-all duration-500 shadow-2xl overflow-hidden relative", currentStatusConfig.glow)}>
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", currentStatusConfig.color)} />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg", currentStatusConfig.color.replace('/20', ''))}>
                    <StatusIcon size={30} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Current Status</p>
                    <h2 className="text-xl font-bold text-white">{currentStatusConfig.text}</h2>
                  </div>
                </div>
                {estimatedDelivery && order.status !== "delivered" && (
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground mb-1">Arrival</p>
                    <p className="text-xl font-bold text-lime">{estimatedDelivery}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1.5 bg-white/5 rounded-3xl border border-white/5 mt-6">
              {[
                { id: 'tracking', label: 'Tracking', icon: Navigation2 },
                { id: 'details', label: 'Order Info', icon: Package },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2",
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-xl shadow-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-8 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === "tracking" ? (
            <motion.div key="tracking-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="space-y-8">
              <PointsEarned points={order.points_earned || 0} isDelivered={order.status === "delivered"} />

              {isActiveDelivery && (
                <div className="space-y-8">
                  <StatusTimeline currentStatus={order.status} statusHistory={statusHistory} estimatedDelivery={estimatedDelivery || undefined} />

                  {runner && (
                    <PremiumLiveMap
                      runnerLocation={runnerLocation}
                      deliveryAddress={order.delivery_address}
                      runnerName={runner.name}
                      runnerPhone={runner.phone}
                      onCallRunner={handleCallRunner}
                      onChatRunner={() => setShowChat(true)}
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <WeatherWidget />
                    {order.delivery_otp && order.status === "out_for_delivery" && (
                      <div onClick={copyOTP} className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-lime/20 rounded-3xl blur-xl group-hover:bg-lime/30 transition-all" />
                        <div className="relative glass-card bg-black/40 p-6 rounded-3xl border border-lime/30 text-center flex flex-col items-center justify-center gap-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-lime mb-2">Delivery OTP</p>
                          <div className="flex gap-2">
                            {order.delivery_otp.split('').map((d, i) => (
                              <span key={i} className="w-10 h-14 bg-white/10 rounded-xl flex items-center justify-center text-2xl font-black text-white">{d}</span>
                            ))}
                          </div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-3">Share with runner only</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {runner && (
                <RunnerCard runner={runner} onCall={handleCallRunner} onChat={() => setShowChat(true)} onTip={() => setShowTipModal(true)} isDelivered={order.status === "delivered"} />
              )}

              {deliveryProof && order.status === "delivered" && <DeliveryProofView proof={deliveryProof} />}

              {isActiveDelivery && (
                <DeliveryInstructions
                  instructions={order.delivery_instructions || ""}
                  isContactless={order.is_contactless || false}
                  onUpdateInstructions={handleUpdateInstructions}
                  onToggleContactless={handleToggleContactless}
                  canEdit={["placed", "preparing", "packed"].includes(order.status)}
                />
              )}

              <IssueReporting orderId={order.id} isDelivered={order.status === "delivered"} />
            </motion.div>
          ) : (
            <motion.div key="details-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="space-y-8">
              <OrderDetailsPanel order={order} items={items} onReorder={handleReorder} />

              <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-primary shrink-0"><MapPin size={24} /></div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-1">Delivering To</h3>
                    <p className="font-bold text-lg leading-tight">{order.delivery_address}</p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest">{order.delivery_mode === "room" ? "🚪 Doorstep" : "📍 Spot Pickup"}</Badge>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-white/5 w-full" />

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-secondary shrink-0"><DollarSign size={24} /></div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-1">Payment via</h3>
                    <p className="font-bold text-lg leading-tight uppercase italic">
                      {order.payment_method === "cod" ? "Cash on Delivery" : `Online (${order.payment_method})`}
                    </p>
                    <p className={cn("text-xs font-black uppercase tracking-widest mt-2", order.payment_method !== 'cod' ? 'text-lime' : 'text-amber-500')}>
                      {order.payment_method !== 'cod' ? '✓ Paid Online' : '⚠ Collect Cash'}
                    </p>
                  </div>
                </div>
              </div>

              {order.notes && (
                <div className="glass-card p-6 rounded-3xl border border-white/5 flex items-start gap-4 text-amber-500 italic bg-amber-500/5">
                  <MessageCircle size={20} className="shrink-0" />
                  <p className="text-sm font-medium leading-relaxed">{order.notes}</p>
                </div>
              )}


              {/* RATE ORDER BUTTON */}
              {order.status === 'delivered' && (
                <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 flex flex-col items-center text-center space-y-4 bg-gradient-to-br from-primary/10 to-purple-500/10">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-yellow-400 shadow-xl shadow-purple-500/20 mb-2">
                    <Star size={32} className="fill-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight mb-2">How was it?</h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-xs mx-auto">Help us improve by rating your food and delivery experience.</p>
                  </div>
                  <button
                    onClick={() => navigate(`/feedback?orderId=${order.id}`)}
                    className="w-full py-4 bg-white text-black rounded-2xl font-bold uppercase tracking-wide hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
                  >
                    Rate Order
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90vw] max-w-sm z-50">
        <div className="glass-card bg-background/80 backdrop-blur-3xl p-3 rounded-[2.5rem] border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex gap-2">
          {runner && isActiveDelivery ? (
            <>
              <button onClick={handleCallRunner} className="flex-1 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-tight text-sm transition-all border border-white/10">
                <Phone size={18} /> Call
              </button>
              <button onClick={() => setShowChat(true)} className="flex-1 h-14 bg-primary text-white rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-tight text-sm transition-all shadow-xl shadow-primary/20">
                <MessageCircle size={18} /> Chat
              </button>
            </>
          ) : order.status === "delivered" ? (
            <button onClick={handleReorder} className="flex-1 h-14 bg-primary text-white rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-tight text-base transition-all shadow-xl shadow-primary/20">
              <RefreshCw size={20} /> Reorder Now
            </button>
          ) : (
            <button onClick={() => navigate("/")} className="flex-1 h-14 bg-white/5 text-white rounded-2xl flex items-center justify-center gap-3 font-bold uppercase tracking-tight text-base transition-all">
              Return Home
            </button>
          )}
        </div>
      </div>

      <OrderCelebration show={showDelivered} type="delivered" onComplete={() => setShowDelivered(false)} />
    </div >
  );
};

export default PremiumOrderTracking;
