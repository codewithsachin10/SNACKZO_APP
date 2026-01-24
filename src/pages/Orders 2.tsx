import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Package, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string;
}

interface OrderItem {
  product_id: string;
  quantity: number;
}

const statusColors: Record<string, string> = {
  placed: "bg-secondary",
  packed: "bg-accent",
  out_for_delivery: "bg-cyan",
  delivered: "bg-lime",
  cancelled: "bg-destructive text-destructive-foreground"
};

const Orders = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reorderingId, setReorderingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleReorder = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReorderingId(orderId);

    try {
      // Fetch order items
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select("product_id, quantity")
        .eq("order_id", orderId);

      if (itemsError || !items) {
        toast.error("Could not fetch order items");
        setReorderingId(null);
        return;
      }

      let addedCount = 0;
      let unavailableCount = 0;

      // Add each item to cart
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
            pridiv
                key={order.id}
                className="neu-card bg-card p-4"
              >
                <div 
                  onClick={() => navigate(`/orders/${order.id}`)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 border-3 border-foreground text-xs font-bold uppercase ${statusColors[order.status] || "bg-muted"}`}>
                          {order.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          #{order.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="font-bold">₹{order.total}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.delivery_address}
                      </p>
                    </div>
                    <ChevronRight size={24} className="text-muted-foreground" />
                  </div>
                </div>
                
                {/* Reorder Button */}
                <button
                  onClick={(e) => handleReorder(order.id, e)}
                  disabled={reorderingId === order.id}
                  className="mt-3 w-full neu-btn bg-secondary hover:bg-secondary/80 text-secondary-foreground py-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw size={16} className={reorderingId === order.id ? "animate-spin" : ""} />
                  {reorderingId === order.id ? "Adding to Cart..." : "Reorder"}
                </button>
              </div
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold uppercase mb-8">Your Orders</h1>

        {orders.length === 0 ? (
          <div className="neu-card bg-card p-12 text-center">
            <Package size={64} className="mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold uppercase mb-2">No Orders Yet</h2>
            <p className="text-muted-foreground mb-6">
              You haven't placed any orders. Start shopping!
            </p>
            <button
              onClick={() => navigate("/products")}
              className="neu-btn bg-primary text-primary-foreground px-8 py-3"
            >
              Browse Products
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/orders/${order.id}`)}
                className="neu-card bg-card p-4 w-full text-left hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 border-3 border-foreground text-xs font-bold uppercase ${statusColors[order.status] || "bg-muted"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        #{order.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="font-bold">₹{order.total}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(order.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {order.delivery_address}
                    </p>
                  </div>
                  <ChevronRight size={24} className="text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Orders;
