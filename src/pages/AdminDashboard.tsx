import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DollarSign, ShoppingBag, Clock,
  TrendingUp, Users, AlertTriangle, Search,
  Plus, Minus, Check, X, RefreshCw, Home
} from "lucide-react";
import UserManagement from "@/components/admin/UserManagement";
import ProductManagement from "@/components/admin/ProductManagement";
import CategoryManagement from "@/components/admin/CategoryManagement";
import AdvancedAnalytics from "@/components/admin/AdvancedAnalytics";
import PromotionsDiscounts from "@/components/admin/PromotionsDiscounts";
import CustomerInsights from "@/components/admin/CustomerInsights";
import StoreSettings from "@/components/admin/StoreSettings";
import RunnerManagement from "@/components/admin/RunnerManagement";
import WalletManagement from "@/components/admin/WalletManagement";
import AnnouncementsManager from "@/components/admin/AnnouncementsManager";
import OrdersManagement from "@/components/admin/OrdersManagement";
import { AdminFeatureControls } from "@/components/admin/FeatureControls";
import SystemHealth from "@/components/admin/SystemHealth";
import SupportManagement from "@/components/admin/SupportManagement";
import LiveSupport from "@/components/admin/LiveSupport";
import DatabaseManager from "@/components/admin/DatabaseManager";
import SnackzoPayManagement from "@/components/admin/SnackzoPayManagement";

import { AdminSidebar, AdminTab } from "@/components/admin/AdminSidebar";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  status: "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  total: number;
  created_at: string;
  delivery_address: string;
  payment_method: string;
  delivery_mode: string;
  user_id: string;
  runner_id: string | null;
  items?: OrderItem[];
}

interface Runner {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  active_order_count?: number;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  is_available: boolean;
  price: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

type TabType = AdminTab;

const AdminDashboard = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [runners, setRunners] = useState<Runner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [showStockModal, setShowStockModal] = useState<string | null>(null);
  const [stockInput, setStockInput] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (!isAdmin) {
        toast.error("Access denied. Admin only.");
        navigate("/");
        return;
      }

      fetchData();
      const unsubscribe = subscribeToOrders();
      return unsubscribe;
    }
  }, [user, isAdmin, authLoading, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    const [ordersRes, productsRes, categoriesRes, orderItemsRes, runnersRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("*").order("display_order"),
      supabase.from("order_items").select("*"),
      supabase.from("runners").select("*").eq("is_active", true)
    ]);

    // Calculate active order counts for runners
    let enrichedRunners: Runner[] = [];
    if (runnersRes.data) {
      const activeOrders = ordersRes.data?.filter(o =>
        ['packed', 'out_for_delivery'].includes(o.status) && o.runner_id
      ) || [];

      const counts: Record<string, number> = {};
      activeOrders.forEach(o => {
        if (o.runner_id) {
          counts[o.runner_id] = (counts[o.runner_id] || 0) + 1;
        }
      });

      enrichedRunners = runnersRes.data.map((r: any) => ({
        ...r,
        active_order_count: counts[r.id] || 0
      }));
      setRunners(enrichedRunners);
    }

    if (ordersRes.data && orderItemsRes.data) {
      const ordersWithItems = ordersRes.data.map(order => ({
        ...order,
        items: orderItemsRes.data.filter((item: any) => item.order_id === order.id)
      }));
      setOrders(ordersWithItems as Order[]);
    }
    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);

    setIsLoading(false);
  };

  const subscribeToOrders = () => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, () => {
        fetchData();
        // Play notification sound
        try {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) { }

        toast.success("🔔 New order received!", {
          description: `Order placed at ${new Date().toLocaleTimeString()}`,
          duration: 10000,
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const getFilteredOrders = (startDate: Date) =>
      orders.filter(o => new Date(o.created_at) >= startDate && o.status !== "cancelled");

    const todayOrders = getFilteredOrders(today);
    const weekOrders = getFilteredOrders(weekAgo);

    // Use Number() to ensure we don't accidentally concatenate strings if data is bad
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const weekRevenue = weekOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgOrderValue = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;

    // Hourly breakdown for today
    const hourlyData = Array(24).fill(0).map((_, hour) => {
      const hourOrders = todayOrders.filter(o => new Date(o.created_at).getHours() === hour);
      return {
        hour,
        count: hourOrders.length,
        revenue: hourOrders.reduce((s, o) => s + Number(o.total || 0), 0)
      };
    });

    // Customer frequency
    const customerOrders: Record<string, number> = {};
    orders.forEach(o => {
      customerOrders[o.user_id] = (customerOrders[o.user_id] || 0) + 1;
    });
    const repeatCustomers = Object.values(customerOrders).filter(c => c > 1).length;

    const deliveryCount = orders.filter(o => o.status === "delivered").length;
    const cancelCount = orders.filter(o => o.status === "cancelled").length;

    return {
      todayOrders: todayOrders.length,
      todayRevenue,
      weekRevenue,
      avgOrderValue,
      activeOrders: orders.filter(o => !["delivered", "cancelled"].includes(o.status)).length,
      lowStockCount: products.filter(p => p.stock <= 5 && p.stock > 0).length,
      outOfStockCount: products.filter(p => p.stock === 0 || !p.is_available).length,
      hourlyData,
      repeatCustomers,
      totalCustomers: Object.keys(customerOrders).length,
      deliveryRate: orders.length > 0 ? (deliveryCount / orders.length * 100) : 0,
      cancelRate: orders.length > 0 ? (cancelCount / orders.length * 100) : 0,
      codOrders: todayOrders.filter(o => o.payment_method === "cod").length,
      upiOrders: todayOrders.filter(o => o.payment_method === "upi").length,
    };
  }, [orders, products]);

  // Filtered products for Inventory Tab
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [products, searchQuery]);

  // Actions
  const updateOrderStatus = async (orderId: string, newStatus: Order["status"]) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      toast.error("Failed to update status");
      return;
    }

    toast.success(`Order status updated to ${newStatus.replace(/_/g, " ")}`);
    fetchData();

    // Trigger Notifications (Serverless Functions)
    try {
      await Promise.all([
        supabase.functions.invoke("notify-order-status", { body: { orderId, newStatus } }),
        supabase.functions.invoke("send-push-notification", {
          body: { userId: order.user_id, title: "Order Update", body: `Status: ${newStatus}`, url: `/orders/${orderId}`, orderId }
        })
      ]);
    } catch (e) {
      console.error("Notification trigger error", e);
    }
  };

  const assignRunner = async (orderId: string, runnerId: string | null) => {
    const { error } = await supabase.from("orders").update({ runner_id: runnerId }).eq("id", orderId);
    if (error) {
      toast.error("Failed to assign runner");
    } else {
      toast.success(runnerId ? "Runner assigned" : "Runner removed");
      fetchData();

      // Notify Runner
      if (runnerId) {
        supabase.functions.invoke("notify-runner-sms", { body: { orderId, runnerId } }).catch(console.error);
      }
    }
  };

  const updateStock = async (productId: string, newStock: number) => {
    const { error } = await supabase
      .from("products")
      .update({ stock: Math.max(0, newStock), is_available: newStock > 0 })
      .eq("id", productId);

    if (error) toast.error("Failed to update stock");
    else {
      toast.success("Stock updated");
      setShowStockModal(null);
      setStockInput("");
      fetchData();
    }
  };

  const toggleAvailability = async (productId: string, current: boolean) => {
    const { error } = await supabase.from("products").update({ is_available: !current }).eq("id", productId);
    if (!error) {
      toast.success(!current ? "Back in stock" : "Marked unavailable");
      fetchData();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const lowStockProducts = products.filter(p => p.stock <= 5 && p.stock > 0);
  const outOfStockProducts = products.filter(p => p.stock === 0 || !p.is_available);

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} stats={stats} />

      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen bg-background/50">
        <div className="max-w-7xl mx-auto w-full space-y-6">

          {/* Page Header */}
          <div className="flex items-center justify-between mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div>
              <h2 className="text-3xl font-bold tracking-tight capitalize">
                {activeTab.replace("-", " ")}
              </h2>
              <p className="text-muted-foreground mt-1">
                {activeTab === "orders" ? "Manage and track all customer orders" :
                  activeTab === "inventory" ? "Track stock levels and availability" :
                    "Admin control center"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="p-2.5 hover:bg-muted rounded-xl transition-all border border-transparent hover:border-border active:scale-95"
                title="Refresh Data"
              >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-medium transition-all"
              >
                <Home size={18} />
                Store
              </button>
            </div>
          </div>

          {/* Quick Stats - Only show on Orders or Analytics tab */}
          {(activeTab === "orders" || activeTab === "analytics") && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="glass-card p-4 bg-gradient-to-br from-lime/20 to-lime/5 border-lime/30 hover:scale-[1.02] transition-transform">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Revenue</p>
                <p className="text-2xl font-bold mt-1">₹{stats.todayRevenue}</p>
              </div>
              <div className="glass-card p-4 bg-gradient-to-br from-secondary/20 to-secondary/5 border-secondary/30 hover:scale-[1.02] transition-transform">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Orders</p>
                <p className="text-2xl font-bold mt-1">{stats.todayOrders}</p>
              </div>
              <div className="glass-card p-4 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:scale-[1.02] transition-transform">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
                <p className="text-2xl font-bold mt-1">{stats.activeOrders}</p>
              </div>
              <div className="glass-card p-4 bg-gradient-to-br from-accent/20 to-accent/5 border-accent/30 hover:scale-[1.02] transition-transform">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Value</p>
                <p className="text-2xl font-bold mt-1">₹{stats.avgOrderValue.toFixed(0)}</p>
              </div>
              <div className="glass-card p-4 bg-gradient-to-br from-cyan/20 to-cyan/5 border-cyan/30 hover:scale-[1.02] transition-transform">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Customers</p>
                <p className="text-2xl font-bold mt-1">{stats.totalCustomers}</p>
              </div>
              <div className={`glass-card p-4 hover:scale-[1.02] transition-transform ${stats.lowStockCount > 0 ? "bg-gradient-to-br from-destructive/20 to-destructive/5 border-destructive/30" : "bg-gradient-to-br from-muted/20 to-muted/5"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Alerts</p>
                    <p className="text-2xl font-bold mt-1">{stats.lowStockCount + stats.outOfStockCount}</p>
                  </div>
                  {stats.lowStockCount > 0 && <AlertTriangle size={18} className="text-destructive" />}
                </div>
              </div>
            </div>
          )}

          {/* ----- TAB CONTENT ----- */}

          {/* Orders Tab -> NEW COMPONENT */}
          {activeTab === "orders" && (
            <OrdersManagement
              orders={orders}
              runners={runners}
              isLoading={isLoading}
              onUpdateStatus={updateOrderStatus}
              onAssignRunner={assignRunner}
            />
          )}

          {/* Inventory Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-4">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full glass-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => {
                  const category = categories.find(c => c.id === product.category_id);
                  const isLow = product.stock <= 5 && product.stock > 0;
                  const isOut = product.stock === 0 || !product.is_available;

                  return (
                    <div key={product.id} className={`glass-card p-4 ${isOut ? "opacity-60" : isLow ? "border-destructive/50" : ""}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {category?.emoji} {category?.name || "Uncategorized"} • ₹{product.price}
                          </p>
                        </div>
                        {isLow && <AlertTriangle size={16} className="text-destructive" />}
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <button
                          onClick={() => updateStock(product.id, product.stock - 1)}
                          disabled={product.stock <= 0}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 disabled:opacity-50"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          onClick={() => { setShowStockModal(product.id); setStockInput(product.stock.toString()); }}
                          className="flex-1 text-center py-1.5 rounded-lg bg-muted font-bold"
                        >
                          {product.stock}
                        </button>
                        <button
                          onClick={() => updateStock(product.id, product.stock + 1)}
                          className="p-1.5 rounded-lg bg-muted hover:bg-muted/80"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => toggleAvailability(product.id, product.is_available)}
                        className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${product.is_available
                          ? "bg-lime/20 text-lime border border-lime/30 hover:bg-lime/30"
                          : "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30"
                          }`}
                      >
                        {product.is_available ? "Available" : "Unavailable"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="glass-card p-4">
                  <p className="text-sm text-muted-foreground mb-1">Week Revenue</p>
                  <p className="text-3xl font-bold text-lime">₹{stats.weekRevenue}</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-sm text-muted-foreground mb-1">Delivery Rate</p>
                  <p className="text-3xl font-bold text-secondary">{stats.deliveryRate.toFixed(1)}%</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-sm text-muted-foreground mb-1">Cancel Rate</p>
                  <p className="text-3xl font-bold text-destructive">{stats.cancelRate.toFixed(1)}%</p>
                </div>
                <div className="glass-card p-4">
                  <p className="text-sm text-muted-foreground mb-1">Repeat Customers</p>
                  <p className="text-3xl font-bold text-accent">{stats.repeatCustomers}</p>
                </div>
              </div>

              {/* Simple Hourly Graph */}
              <div className="glass-card p-6">
                <h3 className="font-bold mb-4">Today's Hourly Activity</h3>
                <div className="flex items-end gap-1 h-32">
                  {stats.hourlyData.slice(18, 24).concat(stats.hourlyData.slice(0, 4)).map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-primary/60 rounded-t hover:bg-primary transition-all"
                        style={{ height: `${Math.max((h.count / Math.max(...stats.hourlyData.map(x => x.count), 1)) * 100, 5)}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-6">
              {outOfStockProducts.length > 0 && (
                <div>
                  <h3 className="font-bold text-destructive mb-3 flex items-center gap-2">
                    <X size={18} />
                    Out of Stock ({outOfStockProducts.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {outOfStockProducts.map(p => (
                      <div key={p.id} className="glass-card p-4 border-destructive/30 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">₹{p.price}</p>
                        </div>
                        <button
                          onClick={() => { setShowStockModal(p.id); setStockInput("10"); }}
                          className="neon-btn bg-lime text-lime-foreground px-3 py-1.5 text-sm rounded-lg"
                        >
                          Restock
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {lowStockProducts.length > 0 && (
                <div>
                  <h3 className="font-bold text-secondary mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Low Stock ({lowStockProducts.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lowStockProducts.map(p => (
                      <div key={p.id} className="glass-card p-4 border-secondary/30 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Only {p.stock} left • ₹{p.price}</p>
                        </div>
                        <button
                          onClick={() => { setShowStockModal(p.id); setStockInput((p.stock + 10).toString()); }}
                          className="glass-card px-3 py-1.5 text-sm hover:bg-muted/50"
                        >
                          + Add Stock
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
                <div className="text-center py-10 opacity-50">
                  <Check className="w-12 h-12 mx-auto mb-2" />
                  <p>No Alerts</p>
                </div>
              )}
            </div>
          )}

          {/* Other Tabs */}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "products" && <ProductManagement />}
          {activeTab === "categories" && <CategoryManagement />}
          {activeTab === "advanced-analytics" && <AdvancedAnalytics />}
          {activeTab === "promotions" && <PromotionsDiscounts />}
          {activeTab === "customer-insights" && <CustomerInsights />}
          {activeTab === "announcements" && <AnnouncementsManager />}
          {activeTab === "features" && <AdminFeatureControls />}
          {activeTab === "database" && <DatabaseManager />}
          {activeTab === "system-health" && <SystemHealth />}
          {activeTab === "settings" && <StoreSettings />}
          {activeTab === "runners" && <RunnerManagement />}
          {activeTab === "wallet" && <WalletManagement />}
          {activeTab === "snackzopay" && <SnackzoPayManagement />}
          {activeTab === "support" && <SupportManagement />}
          {activeTab === "live-chat" && <LiveSupport />}

        </div>
      </main>

      {/* Stock Update Modal */}
      {showStockModal && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50" onClick={() => setShowStockModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-6 w-full max-w-sm z-50 animate-in zoom-in-95">
            <h3 className="font-bold mb-4">Update Stock</h3>
            <input
              type="number"
              value={stockInput}
              onChange={e => setStockInput(e.target.value)}
              className="w-full glass-card p-3 mb-4 text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
              min="0"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowStockModal(null)}
                className="flex-1 glass-card py-2 hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={() => updateStock(showStockModal, parseInt(stockInput) || 0)}
                className="flex-1 neon-btn bg-primary text-primary-foreground py-2 rounded-xl"
              >
                Update
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
