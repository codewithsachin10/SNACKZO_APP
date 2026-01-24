import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  TrendingUp,
  Users,
  UserPlus,
  DollarSign,
  BarChart3,
  Calendar,
  ShoppingBag,
} from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  hostel_block: string | null;
  room_number: string | null;
  created_at: string;
}

interface Order {
  user_id: string;
  created_at: string;
  total: number;
  status: string;
}

interface CustomerData {
  user_id: string;
  total_orders: number;
  total_spent: number;
  last_order_date: string;
}

const CustomerInsights = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"week" | "month" | "all">("month");

  useEffect(() => {
    fetchData();
  }, [timeFilter]);

  const fetchData = async () => {
    setIsLoading(true);

    const [profilesRes, ordersRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("user_id, created_at, total, status"),
    ]);

    if (profilesRes.data) setProfiles(profilesRes.data);
    if (ordersRes.data) setOrders(ordersRes.data);
    setIsLoading(false);
  };

  // Calculate customer insights from orders
  const customerData = useMemo(() => {
    const customerMap: Record<string, CustomerData> = {};
    
    orders
      .filter(o => o.status !== "cancelled")
      .forEach(order => {
        if (!customerMap[order.user_id]) {
          customerMap[order.user_id] = {
            user_id: order.user_id,
            total_orders: 0,
            total_spent: 0,
            last_order_date: order.created_at,
          };
        }
        customerMap[order.user_id].total_orders += 1;
        customerMap[order.user_id].total_spent += Number(order.total);
        if (new Date(order.created_at) > new Date(customerMap[order.user_id].last_order_date)) {
          customerMap[order.user_id].last_order_date = order.created_at;
        }
      });

    return Object.values(customerMap);
  }, [orders]);

  const analytics = useMemo(() => {
    const recentSignups = profiles.filter((p) => {
      const daysSinceSignup =
        (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSignup <= 30;
    });

    const topSpenders = [...customerData]
      .sort((a, b) => b.total_spent - a.total_spent)
      .slice(0, 5);

    const topOrderers = [...customerData]
      .sort((a, b) => b.total_orders - a.total_orders)
      .slice(0, 5);

    const avgLifetimeValue =
      customerData.length > 0
        ? customerData.reduce((sum, i) => sum + i.total_spent, 0) / customerData.length
        : 0;

    const sortedByAOV = [...customerData].sort(
      (a, b) => (b.total_spent / b.total_orders) - (a.total_spent / a.total_orders)
    );
    const medianOrderValue =
      sortedByAOV.length > 0
        ? sortedByAOV[Math.floor(sortedByAOV.length / 2)].total_spent / sortedByAOV[Math.floor(sortedByAOV.length / 2)].total_orders
        : 0;

    const inactiveCustomers = customerData.filter((i) => {
      if (!i.last_order_date) return true;
      const daysSinceOrder =
        (Date.now() - new Date(i.last_order_date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceOrder > 30;
    }).length;

    const activeCustomers = customerData.filter((i) => {
      if (!i.last_order_date) return false;
      const daysSinceOrder =
        (Date.now() - new Date(i.last_order_date).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceOrder <= 7;
    }).length;

    return {
      totalCustomers: profiles.length,
      recentSignups: recentSignups.length,
      topSpenders,
      topOrderers,
      avgLifetimeValue,
      medianOrderValue,
      activeCustomers,
      inactiveCustomers,
    };
  }, [profiles, customerData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <Users size={14} /> Total Customers
          </p>
          <p className="text-2xl font-bold">{analytics.totalCustomers}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <UserPlus size={14} /> Recent Signups
          </p>
          <p className="text-2xl font-bold text-lime">{analytics.recentSignups}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <TrendingUp size={14} /> Active (7d)
          </p>
          <p className="text-2xl font-bold text-secondary">{analytics.activeCustomers}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
            <DollarSign size={14} /> Avg LTV
          </p>
          <p className="text-2xl font-bold">₹{analytics.avgLifetimeValue.toFixed(0)}</p>
        </div>
      </div>

      {/* Time Filter */}
      <div className="flex gap-2">
        {["week", "month", "all"].map((filter) => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter as typeof timeFilter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              timeFilter === filter
                ? "bg-primary text-primary-foreground"
                : "glass-card hover:bg-muted/50"
            }`}
          >
            {filter === "week" ? "This Week" : filter === "month" ? "This Month" : "All Time"}
          </button>
        ))}
      </div>

      {/* Top Spenders */}
      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <DollarSign size={18} className="text-lime" />
          Top Spenders
        </h3>
        <div className="space-y-2">
          {analytics.topSpenders.map((customer, idx) => {
            const profile = profiles.find((p) => p.user_id === customer.user_id);

            return (
              <div key={customer.user_id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-muted-foreground w-6">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{profile?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{profile?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lime">₹{customer.total_spent.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {customer.total_orders} orders
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Most Frequent Buyers */}
      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <ShoppingBag size={18} className="text-secondary" />
          Most Frequent Buyers
        </h3>
        <div className="space-y-2">
          {analytics.topOrderers.map((customer, idx) => {
            const profile = profiles.find((p) => p.user_id === customer.user_id);

            return (
              <div key={customer.user_id} className="glass-card p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-bold text-muted-foreground w-6">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-sm">{profile?.full_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{profile?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{customer.total_orders}</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{customer.total_spent.toFixed(0)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Segments */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <TrendingUp size={14} /> Highly Active
          </p>
          <p className="text-3xl font-bold text-lime">
            {Math.round(
              (analytics.activeCustomers / analytics.totalCustomers) * 100 || 0
            )}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ordered in last 7 days
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar size={14} /> Inactive
          </p>
          <p className="text-3xl font-bold text-destructive">
            {Math.round(
              (analytics.inactiveCustomers / analytics.totalCustomers) * 100 || 0
            )}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            No orders in 30+ days
          </p>
        </div>

        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <BarChart3 size={14} /> Median AOV
          </p>
          <p className="text-3xl font-bold">₹{analytics.medianOrderValue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Average order value
          </p>
        </div>
      </div>

      {/* Recent Signups */}
      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <UserPlus size={18} className="text-accent" />
          Recent Signups (Last 30 Days)
        </h3>
        <div className="space-y-2 max-h-64 overflow-auto">
          {profiles
            .filter((p) => {
              const daysSinceSignup =
                (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
              return daysSinceSignup <= 30;
            })
            .slice(0, 10)
            .map((profile) => (
              <div key={profile.user_id} className="glass-card p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{profile.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">
                    {profile.hostel_block || "N/A"} - {profile.room_number || "N/A"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString("en-IN")}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerInsights;
