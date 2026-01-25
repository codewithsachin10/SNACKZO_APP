import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, ShoppingBag, CreditCard, Wallet, Star, Gift, Bell, Shield, Mail,
    History, MessageSquare, HelpCircle, Clock, Package, TrendingUp, TrendingDown,
    ChevronRight, Check, AlertCircle, Send, Key, Download, ExternalLink, Ban,
    Eye, Plus, Minus, Crown, Zap, Award, Calendar, MapPin, Phone, User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserWithStats {
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
    email?: string;
    orders_count: number;
    total_spent: number;
    last_order_date: string | null;
    avg_order_value: number;
}

interface Order {
    id: string;
    total: number;
    status: string;
    created_at: string;
    delivery_address: string;
    items?: any[];
}

interface WalletTransaction {
    id: string;
    amount: number;
    type: "credit" | "debit";
    description: string;
    created_at: string;
}

interface Review {
    id: string;
    rating: number;
    comment: string;
    created_at: string;
    product_id?: string;
}

interface SupportTicket {
    id: string;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
}

// Avatar generator
const generateAvatar = (name: string | null, id: string) => {
    const colors = [
        "from-purple-500 to-pink-500", "from-blue-500 to-cyan-500",
        "from-green-500 to-emerald-500", "from-orange-500 to-red-500",
    ];
    const initials = name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?";
    return { gradient: colors[id.charCodeAt(0) % colors.length], initials };
};

// Tier Badge
const TierBadge = ({ tier }: { tier: string }) => {
    const config: Record<string, { bg: string; text: string; icon: string }> = {
        bronze: { bg: "bg-amber-900/30", text: "text-amber-500", icon: "🥉" },
        silver: { bg: "bg-zinc-400/20", text: "text-zinc-400", icon: "🥈" },
        gold: { bg: "bg-yellow-500/20", text: "text-yellow-500", icon: "🥇" },
        platinum: { bg: "bg-purple-500/20", text: "text-purple-400", icon: "💎" },
    };
    const c = config[tier?.toLowerCase()] || config.bronze;
    return <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1", c.bg, c.text)}>{c.icon} {tier?.toUpperCase()}</span>;
};

// Status Badge
const StatusBadge = ({ status }: { status: string }) => {
    const config: Record<string, string> = {
        placed: "bg-blue-500/20 text-blue-500",
        confirmed: "bg-purple-500/20 text-purple-500",
        packing: "bg-yellow-500/20 text-yellow-500",
        out_for_delivery: "bg-orange-500/20 text-orange-500",
        delivered: "bg-green-500/20 text-green-500",
        cancelled: "bg-red-500/20 text-red-500",
        open: "bg-blue-500/20 text-blue-500",
        closed: "bg-green-500/20 text-green-500",
        pending: "bg-yellow-500/20 text-yellow-500",
    };
    return <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", config[status] || "bg-muted text-muted-foreground")}>{status}</span>;
};

interface UserProfileModalProps {
    user: UserWithStats;
    onClose: () => void;
    onRefresh: () => void;
}

const UserProfileModal = ({ user, onClose, onRefresh }: UserProfileModalProps) => {
    const avatar = generateAvatar(user.full_name, user.id);
    const [activeTab, setActiveTab] = useState<"overview" | "orders" | "wallet" | "reviews" | "support" | "activity">("overview");
    const [orders, setOrders] = useState<Order[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [userEmail, setUserEmail] = useState<string | null>(user.email || null);
    const [isLoading, setIsLoading] = useState(false);

    // Action modals
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [showPointsModal, setShowPointsModal] = useState(false);
    const [showNotifyModal, setShowNotifyModal] = useState(false);
    const [showTierModal, setShowTierModal] = useState(false);

    // Fetch user data including email
    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);
            try {
                // Fetch orders, reviews, tickets
                const [ordersRes, reviewsRes, ticketsRes] = await Promise.all([
                    supabase.from("orders").select("id, total, status, created_at, delivery_address").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(20),
                    supabase.from("reviews").select("id, rating, comment, created_at, product_id").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10),
                    supabase.from("support_tickets").select("id, subject, status, priority, created_at").eq("user_id", user.user_id).order("created_at", { ascending: false }).limit(10),
                ]);
                setOrders(ordersRes.data || []);
                setReviews(reviewsRes.data || []);
                setTickets(ticketsRes.data || []);

                // Try to fetch email using RPC function
                try {
                    const { data: emailData } = await supabase.rpc('get_user_email', { user_uuid: user.user_id });
                    if (emailData) setUserEmail(emailData);
                } catch (e) {
                    // Fallback: Try fetching from a view if RPC doesn't exist
                    try {
                        const { data: viewData } = await supabase.from('user_emails_view').select('email').eq('id', user.user_id).maybeSingle();
                        if (viewData?.email) setUserEmail(viewData.email);
                    } catch (e2) {
                        console.log("Email fetch not available");
                    }
                }
            } catch (err) {
                console.error("Fetch error:", err);
            }
            setIsLoading(false);
        };
        fetchUserData();
    }, [user.user_id]);

    // Action handlers
    const handleBanToggle = async () => {
        const { error } = await supabase.from("profiles").update({ is_banned: !user.is_banned }).eq("user_id", user.user_id);
        if (error) toast.error("Failed to update ban status");
        else {
            toast.success(user.is_banned ? "User unbanned" : "User banned");
            onRefresh();
            onClose();
        }
    };

    const handleWalletAction = async (amount: number, type: "credit" | "debit") => {
        const newBalance = type === "credit" ? user.wallet_balance + amount : user.wallet_balance - amount;
        if (newBalance < 0) { toast.error("Insufficient balance"); return; }
        const { error } = await supabase.from("profiles").update({ wallet_balance: newBalance }).eq("user_id", user.user_id);
        if (error) toast.error("Failed to update wallet");
        else {
            toast.success(`₹${amount} ${type === "credit" ? "added to" : "deducted from"} wallet`);
            onRefresh();
            setShowWalletModal(false);
        }
    };

    const handlePointsAction = async (points: number) => {
        const { error } = await supabase.from("profiles").update({
            loyalty_points: user.loyalty_points + points,
            lifetime_points: user.lifetime_points + points,
        }).eq("user_id", user.user_id);
        if (error) toast.error("Failed to add points");
        else {
            toast.success(`${points} points added!`);
            onRefresh();
            setShowPointsModal(false);
        }
    };

    const handleTierChange = async (newTier: string) => {
        const { error } = await supabase.from("profiles").update({ loyalty_tier: newTier }).eq("user_id", user.user_id);
        if (error) toast.error("Failed to update tier");
        else {
            toast.success(`Tier updated to ${newTier}`);
            onRefresh();
            setShowTierModal(false);
        }
    };

    const handleSendNotification = async (title: string, message: string) => {
        const { error } = await supabase.from("notifications").insert({
            user_id: user.user_id,
            title,
            message,
            type: "admin",
            is_read: false,
        });
        if (error) toast.error("Failed to send notification");
        else {
            toast.success("Notification sent!");
            setShowNotifyModal(false);
        }
    };

    const handleResetPassword = async () => {
        toast.info("Password reset email would be sent to user's registered email");
    };

    const handleExportData = () => {
        const data = {
            profile: user,
            orders: orders,
            reviews: reviews,
            tickets: tickets,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `user_${user.id}_data.json`;
        a.click();
        toast.success("User data exported");
    };

    const tabs = [
        { id: "overview", label: "Overview", icon: User },
        { id: "orders", label: "Orders", icon: ShoppingBag, count: orders.length },
        { id: "wallet", label: "Wallet", icon: Wallet },
        { id: "reviews", label: "Reviews", icon: Star, count: reviews.length },
        { id: "support", label: "Support", icon: HelpCircle, count: tickets.length },
        { id: "activity", label: "Activity", icon: History },
    ];

    return (
        <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={onClose}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}>

                    {/* Header */}
                    <div className="p-6 border-b border-border bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 shrink-0">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-20 h-20 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-3xl shadow-xl", avatar.gradient)}>
                                    {avatar.initials}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold flex items-center gap-3">
                                        {user.full_name || "Unknown User"}
                                        {user.is_banned && <span className="px-2 py-1 bg-red-500/20 text-red-500 text-xs rounded-full font-bold">BANNED</span>}
                                    </h2>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                        <span className="flex items-center gap-1"><Phone size={14} />{user.phone || "No phone"}</span>
                                        <span className="flex items-center gap-1"><Mail size={14} />{userEmail || "No email"}</span>
                                        <span className="flex items-center gap-1"><MapPin size={14} />{user.hostel_block || "N/A"} {user.room_number}</span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2">
                                        <TierBadge tier={user.loyalty_tier} />
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Calendar size={12} />Member since {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Zap size={12} />{user.current_streak} day streak
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors"><X size={24} /></button>
                        </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-6 gap-2 p-4 border-b border-border bg-muted/30 shrink-0">
                        {[
                            { label: "Orders", value: user.orders_count, icon: ShoppingBag, color: "text-blue-500" },
                            { label: "Spent", value: `₹${user.total_spent.toFixed(0)}`, icon: CreditCard, color: "text-green-500" },
                            { label: "Wallet", value: `₹${user.wallet_balance}`, icon: Wallet, color: "text-emerald-500" },
                            { label: "Points", value: user.loyalty_points, icon: Star, color: "text-yellow-500" },
                            { label: "Lifetime", value: user.lifetime_points, icon: Award, color: "text-purple-500" },
                            { label: "Badges", value: user.badges_count, icon: Crown, color: "text-pink-500" },
                        ].map((s, i) => (
                            <div key={i} className="text-center p-3 bg-card rounded-xl border border-border">
                                <s.icon size={18} className={cn("mx-auto mb-1", s.color)} />
                                <p className="text-lg font-bold">{s.value}</p>
                                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 p-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                                className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                    activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
                                )}>
                                <tab.icon size={16} />
                                {tab.label}
                                {tab.count !== undefined && <span className="px-1.5 py-0.5 bg-black/20 rounded text-[10px]">{tab.count}</span>}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Overview Tab */}
                        {activeTab === "overview" && (
                            <div className="space-y-6">
                                {/* Quick Actions */}
                                <div>
                                    <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wider">Quick Actions</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <button onClick={() => setShowWalletModal(true)} className="flex items-center gap-3 p-4 bg-green-500/10 hover:bg-green-500/20 rounded-xl transition-all">
                                            <Wallet className="text-green-500" size={20} />
                                            <div className="text-left"><p className="font-medium text-sm">Wallet</p><p className="text-xs text-muted-foreground">Add/Deduct</p></div>
                                        </button>
                                        <button onClick={() => setShowPointsModal(true)} className="flex items-center gap-3 p-4 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl transition-all">
                                            <Gift className="text-purple-500" size={20} />
                                            <div className="text-left"><p className="font-medium text-sm">Points</p><p className="text-xs text-muted-foreground">Add Bonus</p></div>
                                        </button>
                                        <button onClick={() => setShowTierModal(true)} className="flex items-center gap-3 p-4 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-xl transition-all">
                                            <Crown className="text-yellow-500" size={20} />
                                            <div className="text-left"><p className="font-medium text-sm">Tier</p><p className="text-xs text-muted-foreground">Upgrade</p></div>
                                        </button>
                                        <button onClick={() => setShowNotifyModal(true)} className="flex items-center gap-3 p-4 bg-blue-500/10 hover:bg-blue-500/20 rounded-xl transition-all">
                                            <Bell className="text-blue-500" size={20} />
                                            <div className="text-left"><p className="font-medium text-sm">Notify</p><p className="text-xs text-muted-foreground">Send Message</p></div>
                                        </button>
                                    </div>
                                </div>

                                {/* More Actions */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <button onClick={handleBanToggle} className={cn("flex items-center gap-3 p-4 rounded-xl transition-all", user.is_banned ? "bg-emerald-500/10 hover:bg-emerald-500/20" : "bg-red-500/10 hover:bg-red-500/20")}>
                                        <Shield className={user.is_banned ? "text-emerald-500" : "text-red-500"} size={20} />
                                        <div className="text-left"><p className="font-medium text-sm">{user.is_banned ? "Unban" : "Ban"}</p><p className="text-xs text-muted-foreground">User Access</p></div>
                                    </button>
                                    <button onClick={handleResetPassword} className="flex items-center gap-3 p-4 bg-orange-500/10 hover:bg-orange-500/20 rounded-xl transition-all">
                                        <Key className="text-orange-500" size={20} />
                                        <div className="text-left"><p className="font-medium text-sm">Reset</p><p className="text-xs text-muted-foreground">Password</p></div>
                                    </button>
                                    <button onClick={handleExportData} className="flex items-center gap-3 p-4 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-xl transition-all">
                                        <Download className="text-cyan-500" size={20} />
                                        <div className="text-left"><p className="font-medium text-sm">Export</p><p className="text-xs text-muted-foreground">User Data</p></div>
                                    </button>
                                    <button className="flex items-center gap-3 p-4 bg-pink-500/10 hover:bg-pink-500/20 rounded-xl transition-all">
                                        <Mail className="text-pink-500" size={20} />
                                        <div className="text-left"><p className="font-medium text-sm">Email</p><p className="text-xs text-muted-foreground">Send Mail</p></div>
                                    </button>
                                </div>

                                {/* Recent Orders Preview */}
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Recent Orders</h3>
                                        <button onClick={() => setActiveTab("orders")} className="text-xs text-primary hover:underline flex items-center gap-1">View All <ChevronRight size={12} /></button>
                                    </div>
                                    {orders.slice(0, 3).map(order => (
                                        <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-2">
                                            <div className="flex items-center gap-3">
                                                <Package size={18} className="text-muted-foreground" />
                                                <div>
                                                    <p className="text-sm font-medium">Order #{order.id.slice(-6)}</p>
                                                    <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold">₹{order.total}</p>
                                                <StatusBadge status={order.status} />
                                            </div>
                                        </div>
                                    ))}
                                    {orders.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>}
                                </div>
                            </div>
                        )}

                        {/* Orders Tab */}
                        {activeTab === "orders" && (
                            <div className="space-y-3">
                                {isLoading ? (
                                    <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
                                ) : orders.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No orders found</p>
                                ) : orders.map(order => (
                                    <div key={order.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                                <Package className="text-primary" size={20} />
                                            </div>
                                            <div>
                                                <p className="font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</p>
                                                {order.delivery_address && <p className="text-xs text-muted-foreground mt-1">{order.delivery_address}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-bold">₹{order.total}</p>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Wallet Tab */}
                        {activeTab === "wallet" && (
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-6 text-center">
                                    <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
                                    <p className="text-5xl font-bold text-green-500">₹{user.wallet_balance}</p>
                                    <div className="flex gap-3 justify-center mt-4">
                                        <button onClick={() => setShowWalletModal(true)} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg font-medium">
                                            <Plus size={16} /> Add Money
                                        </button>
                                        <button onClick={() => setShowWalletModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg font-medium">
                                            <Minus size={16} /> Deduct
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-3">Transaction History</h3>
                                    <p className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl">
                                        Transaction history will appear here
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Reviews Tab */}
                        {activeTab === "reviews" && (
                            <div className="space-y-3">
                                {reviews.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No reviews yet</p>
                                ) : reviews.map(review => (
                                    <div key={review.id} className="p-4 bg-muted/30 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={16} className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"} />
                                                ))}
                                            </div>
                                            <span className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-sm">{review.comment || "No comment"}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Support Tab */}
                        {activeTab === "support" && (
                            <div className="space-y-3">
                                {tickets.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No support tickets</p>
                                ) : tickets.map(ticket => (
                                    <div key={ticket.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <HelpCircle size={20} className="text-muted-foreground" />
                                            <div>
                                                <p className="font-medium text-sm">{ticket.subject}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <StatusBadge status={ticket.status} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Activity Tab */}
                        {activeTab === "activity" && (
                            <div className="space-y-4">
                                <div className="border-l-2 border-primary/30 pl-6 space-y-6">
                                    {[
                                        { icon: User, text: "Account created", time: user.created_at, color: "text-blue-500" },
                                        ...(user.last_order_date ? [{ icon: ShoppingBag, text: "Last order placed", time: user.last_order_date, color: "text-green-500" }] : []),
                                        { icon: Star, text: `Earned ${user.lifetime_points} lifetime points`, time: null, color: "text-yellow-500" },
                                        { icon: Crown, text: `Reached ${user.loyalty_tier} tier`, time: null, color: "text-purple-500" },
                                    ].map((item, i) => (
                                        <div key={i} className="relative">
                                            <div className={cn("absolute -left-9 w-4 h-4 rounded-full bg-card border-2 border-current", item.color)} />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <item.icon size={16} className={item.color} />
                                                    <span className="text-sm">{item.text}</span>
                                                </div>
                                                {item.time && <span className="text-xs text-muted-foreground">{new Date(item.time).toLocaleDateString()}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Wallet Action Modal */}
            <AnimatePresence>
                {showWalletModal && (
                    <ActionModal title="Wallet Action" onClose={() => setShowWalletModal(false)}>
                        <WalletActionForm onSubmit={handleWalletAction} onClose={() => setShowWalletModal(false)} />
                    </ActionModal>
                )}
            </AnimatePresence>

            {/* Points Action Modal */}
            <AnimatePresence>
                {showPointsModal && (
                    <ActionModal title="Add Bonus Points" onClose={() => setShowPointsModal(false)}>
                        <PointsActionForm onSubmit={handlePointsAction} onClose={() => setShowPointsModal(false)} />
                    </ActionModal>
                )}
            </AnimatePresence>

            {/* Tier Change Modal */}
            <AnimatePresence>
                {showTierModal && (
                    <ActionModal title="Change Tier" onClose={() => setShowTierModal(false)}>
                        <TierChangeForm currentTier={user.loyalty_tier} onSubmit={handleTierChange} onClose={() => setShowTierModal(false)} />
                    </ActionModal>
                )}
            </AnimatePresence>

            {/* Notification Modal */}
            <AnimatePresence>
                {showNotifyModal && (
                    <ActionModal title="Send Notification" onClose={() => setShowNotifyModal(false)}>
                        <NotificationForm userName={user.full_name || "User"} onSubmit={handleSendNotification} onClose={() => setShowNotifyModal(false)} />
                    </ActionModal>
                )}
            </AnimatePresence>
        </>
    );
};

// Action Modal Wrapper
const ActionModal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-card border border-border rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X size={18} /></button>
            </div>
            {children}
        </motion.div>
    </motion.div>
);

// Wallet Form
const WalletActionForm = ({ onSubmit, onClose }: { onSubmit: (amount: number, type: "credit" | "debit") => void; onClose: () => void }) => {
    const [amount, setAmount] = useState("");
    const [type, setType] = useState<"credit" | "debit">("credit");
    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button onClick={() => setType("credit")} className={cn("flex-1 py-2 rounded-lg font-medium transition-all", type === "credit" ? "bg-green-500 text-white" : "bg-muted")}>
                    <Plus size={16} className="inline mr-1" /> Credit
                </button>
                <button onClick={() => setType("debit")} className={cn("flex-1 py-2 rounded-lg font-medium transition-all", type === "debit" ? "bg-red-500 text-white" : "bg-muted")}>
                    <Minus size={16} className="inline mr-1" /> Debit
                </button>
            </div>
            <input type="number" placeholder="Amount (₹)" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-lg text-lg font-bold text-center" />
            <div className="flex gap-2">
                {[50, 100, 200, 500].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))} className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium">₹{v}</button>
                ))}
            </div>
            <button onClick={() => { if (amount) onSubmit(Number(amount), type); }}
                disabled={!amount || Number(amount) <= 0}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-bold disabled:opacity-50">
                {type === "credit" ? "Add" : "Deduct"} ₹{amount || 0}
            </button>
        </div>
    );
};

// Points Form
const PointsActionForm = ({ onSubmit, onClose }: { onSubmit: (points: number) => void; onClose: () => void }) => {
    const [points, setPoints] = useState("");
    return (
        <div className="space-y-4">
            <input type="number" placeholder="Points to add" value={points} onChange={e => setPoints(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-lg text-lg font-bold text-center" />
            <div className="flex gap-2">
                {[10, 25, 50, 100, 500].map(v => (
                    <button key={v} onClick={() => setPoints(String(v))} className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium">{v}</button>
                ))}
            </div>
            <button onClick={() => { if (points) onSubmit(Number(points)); }}
                disabled={!points || Number(points) <= 0}
                className="w-full py-3 bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50">
                Add {points || 0} Points
            </button>
        </div>
    );
};

// Tier Form
const TierChangeForm = ({ currentTier, onSubmit, onClose }: { currentTier: string; onSubmit: (tier: string) => void; onClose: () => void }) => {
    const tiers = ["bronze", "silver", "gold", "platinum"];
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Current: <span className="font-bold">{currentTier}</span></p>
            <div className="grid grid-cols-2 gap-2">
                {tiers.map(tier => (
                    <button key={tier} onClick={() => onSubmit(tier)}
                        disabled={tier === currentTier?.toLowerCase()}
                        className={cn("py-3 rounded-lg font-bold capitalize transition-all disabled:opacity-50",
                            tier === "bronze" ? "bg-amber-900/30 text-amber-500" :
                                tier === "silver" ? "bg-zinc-400/20 text-zinc-400" :
                                    tier === "gold" ? "bg-yellow-500/20 text-yellow-500" :
                                        "bg-purple-500/20 text-purple-400"
                        )}>
                        {tier === "bronze" && "🥉"} {tier === "silver" && "🥈"} {tier === "gold" && "🥇"} {tier === "platinum" && "💎"} {tier}
                    </button>
                ))}
            </div>
        </div>
    );
};

// Notification Form
const NotificationForm = ({ userName, onSubmit, onClose }: { userName: string; onSubmit: (title: string, message: string) => void; onClose: () => void }) => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Sending to: <span className="font-bold">{userName}</span></p>
            <input type="text" placeholder="Notification title" value={title} onChange={e => setTitle(e.target.value)}
                className="w-full p-3 bg-muted border border-border rounded-lg" />
            <textarea placeholder="Message..." value={message} onChange={e => setMessage(e.target.value)} rows={3}
                className="w-full p-3 bg-muted border border-border rounded-lg resize-none" />
            <button onClick={() => { if (title && message) onSubmit(title, message); }}
                disabled={!title || !message}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                <Send size={16} /> Send Notification
            </button>
        </div>
    );
};

export default UserProfileModal;
