import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Search,
    Filter,
    MessageSquare,
    Clock,
    CheckCircle2,
    AlertCircle,
    User,
    Package,
    ChevronRight,
    ArrowLeft,
    Image as ImageIcon,
    DollarSign,
    ShieldCheck,
    MapPin,
    ExternalLink,
    MessageCircle,
    Send,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Ticket {
    id: string;
    order_id: string;
    user_id: string;
    category: string;
    description: string;
    status: 'pending' | 'investigating' | 'resolved' | 'refunded' | 'closed';
    resolution_notes?: string;
    refund_amount?: number;
    created_at: string;
    image_urls?: string[];
    // Fetched separately
    profile?: {
        full_name: string;
        phone: string;
        hostel_block: string;
        room_number: string;
    };
}

interface OrderDetail {
    id: string;
    status: string;
    total: number;
    created_at: string;
    delivery_address: string;
    payment_method: string;
    runner_id?: string;
    user_id?: string;
    notes?: string;
    order_items: {
        product_name: string;
        quantity: number;
        price: number;
    }[];
    runner?: {
        name: string;
        phone: string;
    };
    profile?: {
        full_name: string;
        phone: string;
        hostel_block: string;
        room_number: string;
    };
}

const SupportManagement = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
    const [resolutionText, setResolutionText] = useState("");
    const [refundAmount, setRefundAmount] = useState<string>("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [orderSearchId, setOrderSearchId] = useState("");
    const [isSearchingOrder, setIsSearchingOrder] = useState(false);
    const [lookupMode, setLookupMode] = useState(false);

    useEffect(() => {
        fetchTickets();
    }, [filterStatus]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            // Step 1: Fetch tickets (simple query, no joins)
            let query = supabase
                .from("order_issues")
                .select("*")
                .order("created_at", { ascending: false });

            if (filterStatus !== "all") {
                query = query.eq("status", filterStatus);
            }

            const { data: ticketsData, error: ticketsError } = await query;
            if (ticketsError) {
                console.error("Fetch tickets error:", ticketsError);
                throw ticketsError;
            }

            if (!ticketsData || ticketsData.length === 0) {
                setTickets([]);
                return;
            }

            // Step 2: Get unique user_ids and fetch profiles separately
            const userIds = [...new Set(ticketsData.map(t => t.user_id))];
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("user_id, full_name, phone, hostel_block, room_number")
                .in("user_id", userIds);

            // Step 3: Merge profiles into tickets
            const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
            const enrichedTickets = ticketsData.map(ticket => ({
                ...ticket,
                profile: profilesMap.get(ticket.user_id)
            }));

            setTickets(enrichedTickets as Ticket[]);
        } catch (err: any) {
            toast.error(`Failed to load tickets: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOrderDetails = async (orderId: string, isLookup: boolean = true) => {
        setIsSearchingOrder(true);
        try {
            // Step 1: Fetch order with items
            const { data: orderData, error: orderError } = await supabase
                .from("orders")
                .select("*, order_items (*)")
                .eq("id", orderId)
                .maybeSingle();

            if (orderError) throw orderError;
            if (!orderData) {
                toast.error("Order not found");
                setSelectedOrder(null);
                return;
            }

            // Step 2: Fetch profile for the order's user_id
            let profile = null;
            if (orderData.user_id) {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("full_name, phone, hostel_block, room_number")
                    .eq("user_id", orderData.user_id)
                    .maybeSingle();
                profile = profileData;
            }

            // Step 3: Fetch runner info if assigned
            let runner = null;
            if (orderData.runner_id) {
                const { data: runnerData } = await supabase
                    .from("runners")
                    .select("name, phone")
                    .eq("id", orderData.runner_id)
                    .maybeSingle();
                runner = runnerData;
            }

            setSelectedOrder({
                ...orderData,
                profile,
                runner
            } as OrderDetail);

            // Only set lookup mode if this is a direct lookup (not from clicking a ticket)
            if (isLookup) {
                setLookupMode(true);
                setSelectedTicket(null);
            }
        } catch (err) {
            toast.error("Failed to load order details");
        } finally {
            setIsSearchingOrder(false);
        }
    };

    const handleOrderSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        let searchId = orderSearchId.trim();
        if (!searchId) return;

        // Strip # prefix if present
        if (searchId.startsWith('#')) {
            searchId = searchId.substring(1);
        }

        // If it's a short ID (less than 36 chars), try to find by pattern match
        if (searchId.length < 36) {
            setIsSearchingOrder(true);
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select("id")
                    .ilike("id", `${searchId}%`)
                    .limit(1)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    fetchOrderDetails(data.id);
                } else {
                    toast.error("No order found with that ID");
                    setIsSearchingOrder(false);
                }
            } catch (err) {
                toast.error("Failed to search for order");
                setIsSearchingOrder(false);
            }
        } else {
            // Full UUID provided
            fetchOrderDetails(searchId);
        }
    };

    const handleUpdateTicket = async (status: Ticket['status']) => {
        if (!selectedTicket) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from("order_issues")
                .update({
                    status,
                    resolution: resolutionText,
                    refund_amount: refundAmount ? parseFloat(refundAmount) : null,
                    resolved_at: status === 'resolved' ? new Date().toISOString() : null
                })
                .eq("id", selectedTicket.id);

            if (error) throw error;

            // If reflecting in user wallet (optional logic here)
            if (status === 'resolved' && refundAmount && parseFloat(refundAmount) > 0) {
                // Here you would typically trigger a wallet transaction
                // toast.info("Refund amount should be processed through wallet management.");
            }

            toast.success(`Ticket marked as ${status}`);
            fetchTickets();
            setSelectedTicket(prev => prev ? { ...prev, status, resolution: resolutionText } : null);
        } catch (err) {
            toast.error("Update failed");
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredTickets = tickets.filter(t =>
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const stats = {
        pending: tickets.filter(t => t.status === 'pending').length,
        investigating: tickets.filter(t => t.status === 'investigating').length,
        resolved: tickets.filter(t => (t.status === 'resolved' || t.status === 'refunded')).length,
    };

    return (
        <div className="space-y-6">
            {/* 1. Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass-card p-5 bg-amber-500/10 border-amber-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Pending Review</p>
                    <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <div className="glass-card p-5 bg-blue-500/10 border-blue-500/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">In Investigation</p>
                    <p className="text-3xl font-bold">{stats.investigating}</p>
                </div>
                <div className="glass-card p-5 bg-lime/10 border-lime/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-lime mb-1">Resolved Today</p>
                    <p className="text-3xl font-bold">{stats.resolved}</p>
                </div>
            </div>

            {/* 2. Search & Filter */}
            <div className="flex flex-col xl:flex-row gap-4">
                <div className="flex-1 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            placeholder="Filter tickets..."
                            className="w-full bg-card/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-all font-medium"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'pending', 'investigating', 'resolved', 'refunded'].map((s) => (
                            <button
                                key={s}
                                onClick={() => {
                                    setFilterStatus(s);
                                    setLookupMode(false);
                                }}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
                                    (filterStatus === s && !lookupMode)
                                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                        : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10"
                                )}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full xl:w-80">
                    <form onSubmit={handleOrderSearch} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Package className="h-4 w-4 text-secondary group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Direct Order Lookup (ID)"
                            className="block w-full bg-secondary/5 border border-secondary/20 rounded-2xl pl-11 pr-12 py-3 text-sm focus:ring-1 focus:ring-secondary focus:border-secondary outline-none transition-all"
                            value={orderSearchId}
                            onChange={(e) => setOrderSearchId(e.target.value)}
                        />
                        <button
                            type="submit"
                            disabled={isSearchingOrder}
                            className="absolute inset-y-1.5 right-1.5 px-3 flex items-center justify-center bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-all font-bold text-[10px] uppercase"
                        >
                            {isSearchingOrder ? <Loader2 size={14} className="animate-spin" /> : "Find"}
                        </button>
                    </form>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 3. Ticket List */}
                <div className="lg:col-span-4 space-y-3">
                    <ScrollArea className="h-[600px] pr-4">
                        {lookupMode && selectedOrder && (
                            <div className="mb-6 animate-in fade-in slide-in-from-left-4">
                                <h2 className="text-[10px] font-bold uppercase tracking-widest text-secondary mb-3 px-1">Active Lookup</h2>
                                <div
                                    className="glass-card p-5 border border-secondary/30 bg-secondary/5 shadow-lg shadow-secondary/5 group relative cursor-default"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge className="bg-secondary text-white uppercase text-[9px] font-black tracking-widest">
                                            LOOKUP
                                        </Badge>
                                        <button
                                            onClick={() => {
                                                setLookupMode(false);
                                                setSelectedOrder(null);
                                                setOrderSearchId("");
                                            }}
                                            className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <h4 className="font-bold text-sm tracking-tight mb-1 truncate">Order #{selectedOrder.id.slice(0, 8)}</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Status: {selectedOrder.status}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total: ₹{selectedOrder.total}</p>
                                </div>
                            </div>
                        )}

                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">
                            {lookupMode ? "Other Tickets" : "Support Tickets"}
                        </h2>
                        {isLoading ? (
                            <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={40} /></div>
                        ) : filteredTickets.length > 0 ? (
                            filteredTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => {
                                        setSelectedTicket(ticket);
                                        setLookupMode(false);
                                        fetchOrderDetails(ticket.order_id, false);
                                    }}
                                    className={cn(
                                        "glass-card p-5 border cursor-pointer transition-all hover:bg-white/5 relative group mb-3 last:mb-0",
                                        (selectedTicket?.id === ticket.id && !lookupMode) ? "border-primary bg-primary/5" : "border-white/5"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <Badge className={cn(
                                            "uppercase text-[9px] font-black tracking-widest",
                                            ticket.status === 'pending' ? "bg-amber-500" :
                                                ticket.status === 'investigating' ? "bg-blue-500" :
                                                    (ticket.status === 'resolved' || ticket.status === 'refunded') ? "bg-lime text-black" : "bg-muted text-muted-foreground"
                                        )}>
                                            {ticket.status}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-sm tracking-tight mb-1 truncate">{ticket.profile?.full_name || 'Anonymous User'}</h4>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-3">{(ticket.category || 'issue').replace(/_/g, ' ')} • #{(ticket.order_id || '').slice(0, 8)}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{ticket.description}</p>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 opacity-30">
                                <ShieldCheck size={48} className="mx-auto mb-4" />
                                <p>No support tickets found</p>
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* 4. Ticket Detail View */}
                <div className="lg:col-span-8 space-y-6">
                    <AnimatePresence mode="wait">
                        {(selectedTicket || selectedOrder) ? (
                            <motion.div
                                key={selectedTicket?.id || selectedOrder?.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="space-y-6"
                            >
                                {/* Customer Info (Now fetched via join in lookup) */}
                                <div className="glass-card p-8 border border-white/5 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl" />
                                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-secondary to-blue-600 flex items-center justify-center text-2xl font-bold shadow-xl shadow-secondary/20">
                                                {(selectedTicket?.profile?.full_name || selectedOrder?.profile?.full_name)?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold tracking-tight">
                                                    {selectedTicket?.profile?.full_name || selectedOrder?.profile?.full_name || 'Customer Info'}
                                                </h3>
                                                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mt-1">
                                                    <MessageSquare size={14} /> {selectedTicket?.profile?.phone || selectedOrder?.profile?.phone || 'N/A'}
                                                    <span className="w-1 h-1 rounded-full bg-white/20" />
                                                    <MapPin size={14} /> {(selectedTicket?.profile?.hostel_block || selectedOrder?.profile?.hostel_block)}, {(selectedTicket?.profile?.room_number || selectedOrder?.profile?.room_number)}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedTicket && (
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="border-white/10 hover:bg-blue-500/20 text-blue-400"
                                                    onClick={() => handleUpdateTicket('investigating')}
                                                    disabled={isUpdating}
                                                >
                                                    Investigate
                                                </Button>
                                                <Button
                                                    className="bg-lime text-black hover:bg-lime/90 font-bold"
                                                    onClick={() => handleUpdateTicket('resolved')}
                                                    disabled={isUpdating}
                                                >
                                                    Mark Resolved
                                                </Button>
                                            </div>
                                        )}

                                        {lookupMode && (
                                            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-bold px-4 py-2">
                                                ORDER FINDER ACTIVATED
                                            </Badge>
                                        )}
                                    </div>

                                    {selectedTicket && (
                                        <div className="mt-8 pt-8 border-t border-white/5">
                                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Issue Reported</h5>
                                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                                                <p className="text-sm font-medium leading-relaxed italic">"{selectedTicket.description}"</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Order Details Mini Section */}
                                {selectedOrder ? (
                                    <div className="glass-card p-8 border border-white/5">
                                        <div className="flex items-center justify-between mb-6">
                                            <h5 className="text-[10px] font-bold uppercase tracking-widest text-secondary flex items-center gap-2">
                                                <Package size={14} /> Detailed Order Insights
                                            </h5>
                                            <Badge variant="outline" className="bg-secondary/10 text-secondary border-secondary/20 font-bold">
                                                {selectedOrder.status?.toUpperCase() || 'N/A'}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Value</p>
                                                <p className="text-xl font-bold font-mono">₹{selectedOrder.total}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Timestamp</p>
                                                <p className="text-sm font-medium">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Method</p>
                                                <p className="text-sm font-medium">{selectedOrder.payment_method.toUpperCase()}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Assigned Hero</p>
                                                <p className="text-sm font-medium text-secondary font-bold">{selectedOrder.runner?.name || 'Searching...'}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Itemized Receipt</p>
                                            {selectedOrder.order_items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-white/5 p-4 rounded-xl text-sm font-medium border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{item.quantity}x</span>
                                                        <span>{item.product_name}</span>
                                                    </div>
                                                    <span className="text-muted-foreground font-bold font-mono text-xs">₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 pt-6 border-t border-white/5">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Delivery Address</p>
                                            <p className="text-xs font-medium text-white/70">{selectedOrder.delivery_address}</p>
                                        </div>
                                    </div>
                                ) : selectedTicket && (
                                    <div className="glass-card p-8 border border-amber-500/20 bg-amber-500/5">
                                        <p className="text-amber-500 text-sm font-medium flex items-center gap-2">
                                            <Package size={16} />
                                            Order details could not be loaded. The order may have been deleted.
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            Order ID: {selectedTicket.order_id}
                                        </p>
                                    </div>
                                )}

                                {/* Resolution Form - Only show if there is a ticket OR if it's a lookup we want to resolve */}
                                {selectedTicket && (
                                    <div className="glass-card p-8 border border-white/5 space-y-6">
                                        <h5 className="text-[10px] font-bold uppercase tracking-widest text-lime flex items-center gap-2">
                                            <ShieldCheck size={14} /> Resolve Issue
                                        </h5>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-bold text-muted-foreground uppercase">Resolution Message</label>
                                                <textarea
                                                    className="w-full bg-card/40 border border-white/10 rounded-2xl p-4 min-h-[120px] outline-none focus:border-lime/50 transition-all text-sm font-medium"
                                                    placeholder="Explain how the issue was resolved..."
                                                    value={resolutionText}
                                                    onChange={(e) => setResolutionText(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-bold text-muted-foreground uppercase">Refund Amount (₹)</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                                                        <input
                                                            type="number"
                                                            className="w-full bg-card/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-lime/50 transition-all text-lg font-bold"
                                                            placeholder="0.00"
                                                            value={refundAmount}
                                                            onChange={(e) => setRefundAmount(e.target.value)}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground mt-2">Max refund possible: ₹{selectedOrder?.total || 0}</p>
                                                </div>
                                                <Button
                                                    onClick={() => handleUpdateTicket(parseFloat(refundAmount) > 0 ? 'refunded' : 'resolved')}
                                                    disabled={isUpdating || !resolutionText}
                                                    className="w-full bg-lime text-black hover:bg-lime/90 font-bold py-6 rounded-2xl shadow-xl shadow-lime/20"
                                                >
                                                    {isUpdating ? <Loader2 className="animate-spin" /> : "Complete Resolution ✨"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {lookupMode && !selectedTicket && (
                                    <div className="glass-card p-6 border-dashed border-secondary/30 flex items-center justify-center bg-secondary/5">
                                        <div className="text-center">
                                            <AlertCircle className="mx-auto mb-2 text-secondary" size={24} />
                                            <p className="text-xs font-bold uppercase tracking-wider text-secondary">No ticket is tied to this order</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">To issue a refund, the customer must first raise a ticket.</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="h-[600px] glass-card border-dashed flex flex-col items-center justify-center opacity-30">
                                <MessageCircle size={64} className="mb-4" />
                                <p className="text-lg font-bold">Search an Order ID or select a Ticket</p>
                                <p className="text-sm">Direct lookup allows investigative deep-dives</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SupportManagement;
