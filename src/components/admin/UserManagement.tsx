import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, ShoppingBag, Calendar, Users, UserCheck, UserX,
  Crown, Filter, SortAsc, SortDesc, Grid3X3, List, RefreshCw, Download,
  ChevronDown, X, Eye, Wallet, Gift, Shield, Bell, Mail, MoreVertical,
  Star, Clock, MapPin, Phone, ArrowRight, Ban, CheckCircle, AlertCircle,
  CreditCard, History, MessageSquare, HelpCircle, ExternalLink, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserProfileModal from "./UserProfileModal";

// Types
interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  hostel_block: string | null;
  room_number: string | null;
  wallet_balance: number;
  loyalty_points: number;
  lifetime_points: number;
  loyalty_tier: string;
  total_orders: number;
  current_streak: number;
  longest_streak: number;
  badges_count: number;
  is_banned: boolean;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

interface UserWithStats extends UserProfile {
  email?: string;
  orders_count: number;
  total_spent: number;
  last_order_date: string | null;
  avg_order_value: number;
}

// Avatar Generator
const generateAvatar = (name: string | null, id: string) => {
  const colors = [
    "from-purple-500 to-pink-500",
    "from-blue-500 to-cyan-500",
    "from-green-500 to-emerald-500",
    "from-orange-500 to-red-500",
    "from-indigo-500 to-purple-500",
    "from-yellow-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-teal-500 to-green-500",
  ];
  const colorIndex = id.charCodeAt(0) % colors.length;
  const initials = name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  return { gradient: colors[colorIndex], initials };
};

// Tier Badge Component
const TierBadge = ({ tier }: { tier: string }) => {
  const config: Record<string, { bg: string; text: string; icon: any }> = {
    bronze: { bg: "bg-amber-900/30", text: "text-amber-500", icon: "🥉" },
    silver: { bg: "bg-zinc-400/20", text: "text-zinc-400", icon: "🥈" },
    gold: { bg: "bg-yellow-500/20", text: "text-yellow-500", icon: "🥇" },
    platinum: { bg: "bg-purple-500/20", text: "text-purple-400", icon: "💎" },
  };
  const c = config[tier?.toLowerCase()] || config.bronze;
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1", c.bg, c.text)}>
      {c.icon} {tier?.toUpperCase() || "BRONZE"}
    </span>
  );
};

// Filter Presets
const FILTER_PRESETS = [
  { id: "all", label: "All Users", filter: () => true },
  { id: "active", label: "Active", filter: (u: UserWithStats) => u.orders_count > 0 },
  {
    id: "new", label: "New (7 days)", filter: (u: UserWithStats) => {
      const d = new Date(u.created_at);
      return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }
  },
  { id: "vip", label: "VIP", filter: (u: UserWithStats) => ["gold", "platinum"].includes(u.loyalty_tier?.toLowerCase()) },
  {
    id: "atrisk", label: "At Risk", filter: (u: UserWithStats) => {
      if (!u.last_order_date) return u.orders_count > 0;
      return (Date.now() - new Date(u.last_order_date).getTime()) > 30 * 24 * 60 * 60 * 1000;
    }
  },
  { id: "banned", label: "Banned", filter: (u: UserWithStats) => u.is_banned },
];

const UserManagement = () => {
  // State
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "orders" | "spent" | "name" | "points">("recent");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [activePreset, setActivePreset] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [hostelFilter, setHostelFilter] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to fetch from admin view with emails first, fallback to profiles
      let profilesData: any[] = [];

      const { data: adminViewData, error: adminViewError } = await supabase
        .from("admin_users_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (!adminViewError && adminViewData) {
        profilesData = adminViewData;
      } else {
        // Fallback to profiles table
        const { data: profilesRes } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });
        profilesData = profilesRes || [];
      }

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, user_id, total, status, created_at");

      const ordersByUser: Record<string, { count: number; total: number; last: string | null; avg: number }> = {};
      (ordersData || []).filter(o => o.status !== "cancelled").forEach(order => {
        if (!ordersByUser[order.user_id]) {
          ordersByUser[order.user_id] = { count: 0, total: 0, last: null, avg: 0 };
        }
        ordersByUser[order.user_id].count++;
        ordersByUser[order.user_id].total += Number(order.total);
        if (!ordersByUser[order.user_id].last || new Date(order.created_at) > new Date(ordersByUser[order.user_id].last!)) {
          ordersByUser[order.user_id].last = order.created_at;
        }
      });

      Object.keys(ordersByUser).forEach(uid => {
        ordersByUser[uid].avg = ordersByUser[uid].count > 0 ? ordersByUser[uid].total / ordersByUser[uid].count : 0;
      });

      const usersWithStats: UserWithStats[] = (profilesData || []).map(p => ({
        ...p,
        email: p.email || null,
        wallet_balance: p.wallet_balance || 0,
        loyalty_points: p.loyalty_points || 0,
        lifetime_points: p.lifetime_points || 0,
        loyalty_tier: p.loyalty_tier || "bronze",
        total_orders: p.total_orders || 0,
        current_streak: p.current_streak || 0,
        longest_streak: p.longest_streak || 0,
        badges_count: p.badges_count || 0,
        is_banned: p.is_banned || false,
        orders_count: ordersByUser[p.user_id]?.count || p.total_orders || 0,
        total_spent: ordersByUser[p.user_id]?.total || 0,
        last_order_date: ordersByUser[p.user_id]?.last || null,
        avg_order_value: ordersByUser[p.user_id]?.avg || 0,
      }));

      setUsers(usersWithStats);
      setOrders(ordersData || []);
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("Failed to load users");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && displayCount < filteredUsers.length) {
        setDisplayCount(prev => Math.min(prev + 20, filteredUsers.length));
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [displayCount]);

  // Hostels list
  const hostels = useMemo(() => {
    const set = new Set(users.map(u => u.hostel_block).filter(Boolean));
    return Array.from(set) as string[];
  }, [users]);

  // Filtering & Sorting
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Preset filter
    const preset = FILTER_PRESETS.find(p => p.id === activePreset);
    if (preset) result = result.filter(preset.filter);

    // Tier filter
    if (tierFilter) result = result.filter(u => u.loyalty_tier?.toLowerCase() === tierFilter);

    // Hostel filter
    if (hostelFilter) result = result.filter(u => u.hostel_block === hostelFilter);

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.includes(q) ||
        u.hostel_block?.toLowerCase().includes(q) ||
        u.room_number?.includes(q) ||
        u.id.includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name": cmp = (a.full_name || "").localeCompare(b.full_name || ""); break;
        case "orders": cmp = a.orders_count - b.orders_count; break;
        case "spent": cmp = a.total_spent - b.total_spent; break;
        case "points": cmp = a.loyalty_points - b.loyalty_points; break;
        case "recent": default: cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortOrder === "desc" ? -cmp : cmp;
    });

    return result;
  }, [users, activePreset, tierFilter, hostelFilter, searchQuery, sortBy, sortOrder]);

  // Stats
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.orders_count > 0).length,
    newThisWeek: users.filter(u => (Date.now() - new Date(u.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000).length,
    banned: users.filter(u => u.is_banned).length,
    totalRevenue: users.reduce((s, u) => s + u.total_spent, 0),
    avgWallet: users.length > 0 ? users.reduce((s, u) => s + u.wallet_balance, 0) / users.length : 0,
    vipCount: users.filter(u => ["gold", "platinum"].includes(u.loyalty_tier?.toLowerCase())).length,
  }), [users]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Name", "Phone", "Email", "Hostel", "Room", "Orders", "Spent", "Wallet", "Points", "Tier", "Joined"];
    const rows = filteredUsers.map(u => [
      u.full_name || "", u.phone || "", u.email || "", u.hostel_block || "", u.room_number || "",
      u.orders_count, u.total_spent.toFixed(2), u.wallet_balance, u.loyalty_points, u.loyalty_tier,
      new Date(u.created_at).toLocaleDateString()
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `users_export_${Date.now()}.csv`; a.click();
    toast.success("Exported " + filteredUsers.length + " users");
  };

  // Open profile modal
  const openUserProfile = (user: UserWithStats) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: "Total Users", value: stats.total, icon: Users, color: "text-blue-500" },
          { label: "Active", value: stats.active, icon: UserCheck, color: "text-green-500" },
          { label: "New (7d)", value: stats.newThisWeek, icon: Sparkles, color: "text-purple-500" },
          { label: "Banned", value: stats.banned, icon: UserX, color: "text-red-500" },
          { label: "VIP Users", value: stats.vipCount, icon: Crown, color: "text-yellow-500" },
          { label: "Revenue", value: `₹${(stats.totalRevenue / 1000).toFixed(1)}k`, icon: CreditCard, color: "text-emerald-500" },
          { label: "Avg Wallet", value: `₹${stats.avgWallet.toFixed(0)}`, icon: Wallet, color: "text-cyan-500" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-all">
            <div className="flex items-center justify-between mb-2">
              <s.icon size={18} className={s.color} />
              <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, phone, hostel, room..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Preset Filters */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
          {FILTER_PRESETS.slice(0, 4).map(p => (
            <button key={p.id} onClick={() => { setActivePreset(p.id); setDisplayCount(20); }}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                activePreset === p.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}>
              {p.label}
            </button>
          ))}
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1",
              showFilters ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
            )}>
            <Filter size={12} /> More
          </button>
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
          <option value="recent">Recent</option>
          <option value="name">Name</option>
          <option value="orders">Orders</option>
          <option value="spent">Spent</option>
          <option value="points">Points</option>
        </select>
        <button onClick={() => setSortOrder(o => o === "asc" ? "desc" : "asc")}
          className="p-2 bg-muted/50 border border-border rounded-lg hover:bg-muted">
          {sortOrder === "desc" ? <SortDesc size={16} /> : <SortAsc size={16} />}
        </button>

        {/* View Toggle */}
        <div className="flex p-1 bg-muted/50 rounded-lg">
          <button onClick={() => setViewMode("grid")} className={cn("p-2 rounded", viewMode === "grid" && "bg-primary text-primary-foreground")}>
            <Grid3X3 size={16} />
          </button>
          <button onClick={() => setViewMode("table")} className={cn("p-2 rounded", viewMode === "table" && "bg-primary text-primary-foreground")}>
            <List size={16} />
          </button>
        </div>

        {/* Actions */}
        <button onClick={fetchData} className="p-2 bg-muted/50 border border-border rounded-lg hover:bg-muted">
          <RefreshCw size={16} />
        </button>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
          <Download size={14} /> Export
        </button>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="p-4 bg-muted/30 border border-border rounded-lg flex flex-wrap gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Loyalty Tier</label>
                <select value={tierFilter || ""} onChange={(e) => setTierFilter(e.target.value || null)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm min-w-[120px]">
                  <option value="">All Tiers</option>
                  <option value="bronze">Bronze</option>
                  <option value="silver">Silver</option>
                  <option value="gold">Gold</option>
                  <option value="platinum">Platinum</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Hostel</label>
                <select value={hostelFilter || ""} onChange={(e) => setHostelFilter(e.target.value || null)}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-sm min-w-[150px]">
                  <option value="">All Hostels</option>
                  {hostels.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => { setTierFilter(null); setHostelFilter(null); setActivePreset("all"); }}
                  className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
                  Clear Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-bold text-foreground">{Math.min(displayCount, filteredUsers.length)}</span> of{" "}
          <span className="font-bold text-foreground">{filteredUsers.length}</span> users
        </p>
      </div>

      {/* Users Grid/Table */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.slice(0, displayCount).map((user, i) => {
            const avatar = generateAvatar(user.full_name, user.id);
            return (
              <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
                className={cn("bg-card border rounded-xl p-4 hover:border-primary/50 transition-all cursor-pointer group",
                  user.is_banned ? "border-red-500/50 bg-red-500/5" : "border-border"
                )}
                onClick={() => openUserProfile(user)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-lg shadow-lg", avatar.gradient)}>
                      {avatar.initials}
                    </div>
                    <div>
                      <p className="font-semibold flex items-center gap-2">
                        {user.full_name || "Unknown"}
                        {user.is_banned && <Ban size={14} className="text-red-500" />}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.phone || "No phone"}</p>
                    </div>
                  </div>
                  <TierBadge tier={user.loyalty_tier} />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold">{user.orders_count}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold">₹{user.total_spent.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Spent</p>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-lg">
                    <p className="text-lg font-bold">{user.loyalty_points}</p>
                    <p className="text-[10px] text-muted-foreground">Points</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin size={12} />{user.hostel_block || "N/A"}</span>
                  <span className="flex items-center gap-1"><Clock size={12} />{new Date(user.created_at).toLocaleDateString()}</span>
                </div>

                {/* Quick Actions - Hover */}
                <div className="mt-3 pt-3 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={(e) => { e.stopPropagation(); openUserProfile(user); }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20">
                    <Eye size={12} /> View
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); /* wallet action */ }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-xs font-medium hover:bg-green-500/20">
                    <Wallet size={12} /> Wallet
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Orders</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Spent</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Wallet</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Tier</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.slice(0, displayCount).map((user) => {
                const avatar = generateAvatar(user.full_name, user.id);
                return (
                  <tr key={user.id} className={cn("hover:bg-muted/30 transition-colors", user.is_banned && "bg-red-500/5")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm", avatar.gradient)}>
                          {avatar.initials}
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1">
                            {user.full_name || "Unknown"}
                            {user.is_banned && <Ban size={12} className="text-red-500" />}
                          </p>
                          <p className="text-xs text-muted-foreground">Joined {new Date(user.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{user.phone || "-"}</td>
                    <td className="px-4 py-3 text-sm">{user.hostel_block || "-"} {user.room_number}</td>
                    <td className="px-4 py-3 text-center font-medium">{user.orders_count}</td>
                    <td className="px-4 py-3 text-center font-medium">₹{user.total_spent.toFixed(0)}</td>
                    <td className="px-4 py-3 text-center font-medium text-green-500">₹{user.wallet_balance}</td>
                    <td className="px-4 py-3 text-center"><TierBadge tier={user.loyalty_tier} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openUserProfile(user)} className="p-1.5 hover:bg-muted rounded"><Eye size={14} /></button>
                        <button className="p-1.5 hover:bg-muted rounded"><MoreVertical size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Infinite Scroll Loader */}
      {displayCount < filteredUsers.length && (
        <div ref={loaderRef} className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* User Profile Modal - Placeholder for Phase 2 */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <UserProfileModal user={selectedUser} onClose={() => setShowUserModal(false)} onRefresh={fetchData} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
