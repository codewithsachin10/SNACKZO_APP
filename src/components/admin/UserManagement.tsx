import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, TrendingUp, ShoppingBag, Calendar } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  hostel_block: string | null;
  room_number: string | null;
  created_at: string;
  is_banned?: boolean;
}

interface Order {
  user_id: string;
  total: number;
  created_at: string;
  status: string;
}

interface UserWithInsights extends UserProfile {
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

const UserManagement = () => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "orders" | "spent">("recent");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);

    // Explicitly selecting is_banned. If it doesn't exist yet, it might return null or error slightly, 
    // but usually Supabase just ignores missing columns in select if * is used, but good to be explicit or specific.
    // Actually * is fine if I added the column.
    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("user_id, total, created_at, status"),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    setIsLoading(false);
  };

  const toggleBan = async (userId: string, currentStatus: boolean) => {
    // Optimistic update
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, is_banned: !currentStatus } : p));

    const { error } = await supabase
      .from("profiles" as any)
      .update({ is_banned: !currentStatus })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update ban status");
      // Revert
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, is_banned: currentStatus } : p));
    } else {
      toast.success(currentStatus ? "User unbanned" : "User banned");
    }
  };

  // Calculate user insights from orders
  const users = useMemo(() => {
    const ordersByUser: Record<string, { total_orders: number; total_spent: number; last_order_date: string }> = {};

    orders
      .filter(o => o.status !== "cancelled")
      .forEach(order => {
        if (!ordersByUser[order.user_id]) {
          ordersByUser[order.user_id] = {
            total_orders: 0,
            total_spent: 0,
            last_order_date: order.created_at,
          };
        }
        ordersByUser[order.user_id].total_orders += 1;
        ordersByUser[order.user_id].total_spent += Number(order.total);
        if (new Date(order.created_at) > new Date(ordersByUser[order.user_id].last_order_date)) {
          ordersByUser[order.user_id].last_order_date = order.created_at;
        }
      });

    return profiles.map(profile => ({
      ...profile,
      total_orders: ordersByUser[profile.user_id]?.total_orders || 0,
      total_spent: ordersByUser[profile.user_id]?.total_spent || 0,
      last_order_date: ordersByUser[profile.user_id]?.last_order_date || "",
    }));
  }, [profiles, orders]);

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      result = result.filter(
        (u) =>
          u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.phone?.includes(searchQuery) ||
          u.hostel_block?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortBy === "orders") {
      result.sort((a, b) => b.total_orders - a.total_orders);
    } else if (sortBy === "spent") {
      result.sort((a, b) => b.total_spent - a.total_spent);
    }

    return result;
  }, [users, searchQuery, sortBy]);

  const topCustomers = useMemo(
    () => [...users].sort((a, b) => b.total_spent - a.total_spent).slice(0, 5),
    [users]
  );

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      avgOrdersPerUser:
        users.length > 0
          ? (users.reduce((sum, u) => sum + u.total_orders, 0) / users.length).toFixed(1)
          : 0,
      totalRevenue: users.reduce((sum, u) => sum + u.total_spent, 0),
      activeUsers: users.filter(u => u.total_orders > 0).length,
    }),
    [users]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Users</p>
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Active Users</p>
          <p className="text-2xl font-bold text-lime">{stats.activeUsers}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Avg Orders</p>
          <p className="text-2xl font-bold">{stats.avgOrdersPerUser}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Search and Sort */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="glass-card px-3 py-2 text-sm focus:outline-none"
        >
          <option value="recent">Recent</option>
          <option value="orders">Most Orders</option>
          <option value="spent">Highest Spender</option>
        </select>
      </div>

      {/* Top Customers */}
      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-lime" />
          Top Customers
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          {topCustomers.map((user) => (
            <div key={user.user_id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold">{user.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{user.phone || "N/A"}</p>
                </div>
                <span className="bg-lime/20 text-lime px-2 py-1 rounded text-xs font-bold">
                  ₹{user.total_spent.toFixed(0)}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShoppingBag size={14} />
                  {user.total_orders} orders
                </span>
                {user.last_order_date && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(user.last_order_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Users */}
      <div>
        <h3 className="font-bold mb-3">All Users ({filteredUsers.length})</h3>
        <div className="space-y-2 max-h-96 overflow-auto">
          {filteredUsers.map((user) => (
            <div
              key={user.user_id}
              className={`glass-card p-3 flex items-center justify-between ${user.is_banned ? 'border-destructive/50 bg-destructive/5' : ''}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{user.full_name || "Unknown"}</p>
                  {user.is_banned && <span className="text-[10px] font-bold bg-destructive text-destructive-foreground px-1.5 rounded">BANNED</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {user.hostel_block || "N/A"} - {user.room_number || "N/A"} • {user.phone || "N/A"}
                </p>
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{user.total_orders} orders</span>
                  <span>•</span>
                  <span>₹{user.total_spent.toFixed(0)}</span>
                  <span>•</span>
                  <span>{new Date(user.created_at).toLocaleDateString("en-IN")}</span>
                </div>
              </div>

              <button
                onClick={() => toggleBan(user.user_id, !!user.is_banned)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${user.is_banned
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
                  }`}
              >
                {user.is_banned ? "Unban" : "Ban"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
