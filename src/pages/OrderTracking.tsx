import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Package, CheckCircle, Truck, Home, RefreshCw, MessageCircle } from "lucide-react";
import { LiveOrderTracking } from "@/components/LiveOrderTracking";
import { Chat } from "@/components/Chat";
import OrderCelebration from "@/components/ui/OrderCelebration";
import { DeliveryEstimate } from "@/components/DeliveryEstimate";
import { RunnerRating, RunnerRatingDisplay } from "@/components/RunnerRating";
import { ReportIssueButton } from "@/components/OrderIssueReport";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_id: string;
}

interface Order {
  id: string;
  status: "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
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
}

interface Runner {
  id: string;
  name: string;
  phone: string;
  average_rating?: number;
  total_ratings?: number;
}

interface ExistingRating {
  rating: number;
  feedback?: string;
  delivery_speed_rating?: number;
  communication_rating?: number;
  package_condition_rating?: number;
}

const statusSteps = [
  { key: "placed", label: "Order Placed", icon: Package },
  { key: "packed", label: "Packed", icon: CheckCircle },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
];

const OrderTracking = () => {
  const { orderId } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [runner, setRunner] = useState<Runner | null>(null);
  const [existingRating, setExistingRating] = useState<ExistingRating | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [showDelivered, setShowDelivered] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchOrder();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrder(newOrder);

          if (newOrder.status === 'delivered') {
            setShowDelivered(true);
          }

          toast.success(`Order status updated: ${newOrder.status.replace(/_/g, " ")}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, user, navigate]);

  const fetchOrder = async () => {
    if (!orderId) return;

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

    // Fetch runner info if assigned
    if (orderData.runner_id) {
      const { data: runnerData } = await supabase
        .from("runners")
        .select("id, name, phone, average_rating, total_ratings")
        .eq("id", orderData.runner_id)
        .single();

      if (runnerData) {
        setRunner(runnerData);
      }
    }

    const { data: itemsData } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsData) {
      setItems(itemsData);
    }

    // Fetch existing rating if order is delivered
    if (orderData.status === 'delivered' && orderData.runner_id) {
      const { data: ratingData } = await supabase
        .from("runner_ratings")
        .select("rating, feedback, delivery_speed_rating, communication_rating, package_condition_rating")
        .eq("order_id", orderId)
        .single();

      if (ratingData) {
        setExistingRating(ratingData);
      }
    }

    setIsLoading(false);
  };

  const handleReorder = async () => {
    for (const item of items) {
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", item.product_id)
        .single();

      if (product && product.stock > 0) {
        addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.image_url || "",
          stock: product.stock
        });
      }
    }

    toast.success("Items added to cart!");
    navigate("/checkout");
  };

  const getCurrentStep = () => {
    if (!order) return 0;
    const index = statusSteps.findIndex(step => step.key === order.status);
    return index >= 0 ? index : 0;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl font-bold">Loading order...</div>
      </div>
    );
  }

  if (!order) return null;

  const currentStep = getCurrentStep();

  // Show chat modal
  if (showChat) {
    return (
      <Chat
        orderId={order.id}
        runnerName={runner?.name}
        isModal={true}
        onClose={() => setShowChat(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-secondary border-b-3 border-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/orders")}
            className="neu-btn bg-background p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold uppercase">Order #{order.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Status Tracker */}
        <div className="neu-card bg-card p-6 mb-8">
          <h2 className="font-bold uppercase mb-6 text-center">Order Status</h2>

          <div className="relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-1 bg-muted">
              <div
                className="h-full bg-lime transition-all duration-500"
                style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>

            {/* Steps */}
            <div className="relative flex justify-between">
              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-12 h-12 border-3 border-foreground flex items-center justify-center ${isActive
                        ? isCurrent
                          ? "bg-lime animate-bounce"
                          : "bg-lime"
                        : "bg-muted"
                        }`}
                    >
                      <Icon size={24} />
                    </div>
                    <span className={`text-xs font-bold uppercase mt-2 text-center ${isActive ? "" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {order.status === "delivered" && (
            <div className="mt-8 text-center">
              <div className="inline-block bg-lime border-3 border-foreground px-6 py-3 shadow-neu">
                <span className="font-bold uppercase">🎉 Order Delivered!</span>
              </div>
            </div>
          )}

          {order.status === "cancelled" && (
            <div className="mt-8 text-center">
              <div className="inline-block bg-destructive text-destructive-foreground border-3 border-foreground px-6 py-3">
                <span className="font-bold uppercase">❌ Order Cancelled</span>
              </div>
            </div>
          )}

          {/* Estimated Delivery Time - Show for active orders */}
          {(order.status === "placed" || order.status === "packed" || order.status === "out_for_delivery") && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <DeliveryEstimate 
                runnerId={order.runner_id} 
                orderId={order.id}
                showDetails={order.status === "out_for_delivery"}
              />
            </div>
          )}
        </div>

        {/* Runner Rating - Show for delivered orders */}
        {order.status === "delivered" && runner && (
          <div className="mb-8">
            <RunnerRating
              orderId={order.id}
              runnerId={runner.id}
              runnerName={runner.name}
              existingRating={existingRating || undefined}
              onRatingSubmitted={() => fetchOrder()}
            />
          </div>
        )}

        {/* Live Tracking Section - Show when out for delivery */}
        {(order.status === "out_for_delivery" || order.status === "packed") && runner && (
          <div className="mb-8">
            <LiveOrderTracking
              orderId={order.id}
              deliveryAddress={order.delivery_address}
              runnerName={runner.name}
              runnerPhone={runner.phone}
              runnerId={runner.id}
              orderStatus={order.status}
              estimatedTime="10-15 mins"
              onChatClick={() => setShowChat(true)}
              deliveryOtp={order.delivery_otp}
            />
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Items */}
          <div className="neu-card bg-card p-6">
            <h2 className="font-bold uppercase mb-4">Order Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-background border-3 border-foreground p-3">
                  <div>
                    <p className="font-bold text-sm uppercase">{item.product_name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-bold">₹{item.price * item.quantity}</p>
                </div>
              ))}
            </div>

            {/* Reorder Button */}
            <button
              onClick={handleReorder}
              className="neu-btn bg-accent w-full py-3 mt-6 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Reorder These Items
            </button>
          </div>

          {/* Order Details */}
          <div className="neu-card bg-card p-6">
            <h2 className="font-bold uppercase mb-4">Order Details</h2>

            <div className="space-y-4">
              <div className="bg-background border-3 border-foreground p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Delivery To</p>
                <p className="font-medium">{order.delivery_address}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {order.delivery_mode.replace("_", " ")} Delivery
                </p>
              </div>

              <div className="bg-background border-3 border-foreground p-4">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Payment</p>
                <p className="font-medium uppercase">
                  {order.payment_method === "upi" ? "UPI Payment" : "Pay on Delivery"}
                </p>
              </div>

              {order.notes && (
                <div className="bg-secondary border-3 border-foreground p-4">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Notes</p>
                  <p className="font-medium">{order.notes}</p>
                </div>
              )}

              {/* Bill Summary */}
              <div className="border-t-3 border-foreground pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery</span>
                  <span>{order.delivery_fee === 0 ? "FREE" : `₹${order.delivery_fee}`}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t-3 border-foreground pt-2">
                  <span>Total</span>
                  <span>₹{order.total}</span>
                </div>
              </div>

              {/* Report Issue Button - Show for delivered orders */}
              {order.status === "delivered" && (
                <div className="pt-4">
                  <ReportIssueButton orderId={order.id} />
                </div>
              )}
            </div>
          </div>
        </div>

        <OrderCelebration
          show={showDelivered}
          type="delivered"
          onComplete={() => setShowDelivered(false)}
        />
      </main>
    </div>
  );
};

export default OrderTracking;
