import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Search,
    MessageCircle,
    Package,
    CreditCard,
    Ticket,
    ChevronRight,
    Clock,
    ShieldCheck,
    User,
    AlertCircle,
    ExternalLink,
    MessageSquare,
    History,
    Info,
    Star,
    Plus,
    ArrowUpRight,
    Stethoscope,
    Baby,
    Droplets,
    CheckCircle2,
    XCircle,
    HelpCircle,
    Camera,
    Send,
    Loader2,
    Zap,
    X,
    Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================
// TYPES & MOCK DATA
// ============================================

interface SupportTicket {
    id: string;
    user_id: string;
    order_id?: string;
    category: string;
    description: string;
    status: 'pending' | 'investigating' | 'resolved' | 'refunded' | 'closed';
    resolution_notes?: string;
    refund_amount?: number;
    created_at: string;
    updated_at?: string;
    resolved_at?: string;
}

interface Order {
    id: string;
    created_at: string;
    status: string;
    total: number;
}

const FAQ_GROUPS = [
    {
        title: "Orders & Delivery",
        items: [
            { q: "Where is my order? It's delayed.", a: "Real-time tracking is available on the 'Track Order' page. If delayed past 15 mins, our auto-refund policy might apply." },
            { q: "Missing items in my order?", a: "Report it within 30 mins of delivery via 'Help with Order' for an instant refund." }
        ]
    },
    {
        title: "Payments & Refunds",
        items: [
            { q: "How long until I get my refund?", a: "UPI refunds are instant. Node/Bank cards take 3-5 business days." },
            { q: "Double charged for an order?", a: "Don't worry, extra amounts are automatically reversed by our bank within 24 hours." }
        ]
    },
    {
        title: "Account & Security",
        items: [
            { q: "How to change my hostel block?", a: "Go to Profile > Edit Profile to update your default delivery block." }
        ]
    }
];

// ============================================
// MAIN COMPONENT
// ============================================

const Support = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("help");
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [showIssueModal, setShowIssueModal] = useState<string | null>(null);
    const [showNewTicketForm, setShowNewTicketForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

    // New Ticket Form State - Matches database ENUM: wrong_item, missing_item, late_delivery, damaged_item, wrong_quantity, quality_issue, rude_behavior, other
    const [ticketData, setTicketData] = useState({
        category: 'other' as 'wrong_item' | 'missing_item' | 'late_delivery' | 'damaged_item' | 'wrong_quantity' | 'quality_issue' | 'rude_behavior' | 'other',
        description: '',
        order_id: ''
    });

    // Load Data
    useEffect(() => {
        if (user) {
            loadSupportData();
        }
    }, [user]);

    const loadSupportData = async () => {
        setIsLoading(true);
        try {
            // Fetch Tickets
            const { data: ticketData } = await supabase
                .from("order_issues")
                .select("*")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false });

            if (ticketData) setTickets(ticketData as any);

            // Fetch Recent Orders (more for support ticket selection)
            const { data: orderData } = await supabase
                .from("orders")
                .select("id, created_at, status, total")
                .eq("user_id", user?.id)
                .order("created_at", { ascending: false })
                .limit(20);

            if (orderData) setRecentOrders(orderData as any);
        } catch (err) {
            console.error("Error loading support data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmitTicket = async () => {
        if (!ticketData.description) {
            toast.error("Please provide a description of your issue");
            return;
        }
        if (!ticketData.order_id) {
            toast.error("Please provide an Order ID");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase
                .from("order_issues")
                .insert({
                    user_id: user?.id,
                    order_id: ticketData.order_id,
                    category: ticketData.category,
                    description: ticketData.description
                });

            if (error) {
                console.error("Ticket creation error:", error);
                throw error;
            }

            toast.success("Ticket raised successfully! ✨", {
                description: "Our support hero will investigate this within 15 minutes."
            });

            setShowNewTicketForm(false);
            setTicketData({ category: 'other', description: '', order_id: '' });
            loadSupportData();
            setActiveTab('tickets');
        } catch (err: any) {
            toast.error(`Failed to raise ticket: ${err.message || 'Please try again.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Search Filtering
    const filteredFAQs = FAQ_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(item =>
            item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
    })).filter(group => group.items.length > 0);

    return (
        <div className="min-h-screen bg-background pb-24 selection:bg-primary/30 font-sans overflow-x-hidden">
            <Navbar />

            <main className="container mx-auto px-4 pt-28 pb-8 max-w-2xl">

                {/* 1. HEADER SECTION */}
                <header className="mb-10">
                    <div className="flex items-center gap-4 mb-6">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10"
                        >
                            <ArrowLeft size={18} />
                        </motion.button>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Support & Help</h1>
                            <p className="text-muted-foreground text-sm font-medium">We're here to help you 24/7</p>
                        </div>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-2xl group-focus-within:bg-primary/20 transition-all duration-500 opacity-50" />
                        <div className="relative flex items-center bg-card/40 backdrop-blur-2xl border border-white/10 rounded-2xl px-5 py-4 shadow-2xl">
                            <Search className="text-muted-foreground mr-4" size={20} />
                            <input
                                type="text"
                                placeholder="Search for orders, refunds, payments, or issues"
                                className="bg-transparent border-none outline-none w-full text-base font-medium placeholder:text-muted-foreground/40"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                {/* 2. QUICK ACTIONS */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { id: 'chat', label: 'Support Chat', icon: MessageCircle, color: 'text-primary', bg: 'bg-primary/10', action: () => setIsChatOpen(true) },
                        { id: 'orders', label: 'Order Help', icon: Package, color: 'text-secondary', bg: 'bg-secondary/10', action: () => document.getElementById('recent-orders')?.scrollIntoView({ behavior: 'smooth' }) },
                        { id: 'refunds', label: 'Track Refund', icon: CreditCard, color: 'text-lime', bg: 'bg-lime/10', action: () => setActiveTab('refunds') },
                        { id: 'tickets', label: 'Raise Ticket', icon: Ticket, color: 'text-cyan', bg: 'bg-cyan/10', action: () => setActiveTab('tickets') },
                    ].map((item) => (
                        <motion.button
                            key={item.id}
                            whileHover={{ y: -4, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={item.action}
                            className="glass-card p-4 border border-white/5 flex flex-col items-center justify-center text-center gap-3 transition-all hover:bg-white/5"
                        >
                            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", item.bg, item.color)}>
                                <item.icon size={24} />
                            </div>
                            <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                        </motion.button>
                    ))}
                </section>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="w-full h-12 bg-white/5 rounded-2xl p-1 mb-8 border border-white/5">
                        <TabsTrigger value="help" className="flex-1 rounded-xl text-xs font-bold uppercase tracking-wider">Help Center</TabsTrigger>
                        <TabsTrigger value="tickets" className="flex-1 rounded-xl text-xs font-bold uppercase tracking-wider">Tickets ({tickets.length})</TabsTrigger>
                        <TabsTrigger value="refunds" className="flex-1 rounded-xl text-xs font-bold uppercase tracking-wider">Resolutions</TabsTrigger>
                    </TabsList>

                    {/* HELP CENTER TAB */}
                    <TabsContent value="help" className="space-y-10 focus-visible:outline-none">

                        {/* 3. ORDER SUPPORT SECTION */}
                        <section id="recent-orders">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <History size={14} className="text-secondary" /> Recent Orders
                                </h2>
                                <Button variant="link" onClick={() => navigate("/orders")} className="text-[10px] font-bold uppercase tracking-wider h-auto p-0">View All</Button>
                            </div>
                            <div className="space-y-3">
                                {isLoading ? (
                                    Array(2).fill(0).map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-3xl animate-pulse" />)
                                ) : recentOrders.length > 0 ? (
                                    recentOrders.map((order) => (
                                        <div key={order.id} className="glass-card p-5 border border-white/5 flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-secondary/20 group-hover:text-secondary transition-all">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-sm">#{order.id.slice(0, 8).toUpperCase()}</h4>
                                                    <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString()} • ₹{order.total}</p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider hover:bg-secondary hover:text-white rounded-xl h-8 px-4"
                                                onClick={() => setShowIssueModal(order.id)}
                                            >
                                                Help with this
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8 glass-card border-dashed">
                                        <p className="text-xs text-muted-foreground font-medium italic">No recent orders found</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* 8. PRIORITY & EMERGENCY SUPPORT */}
                        <section className="relative">
                            <div className="absolute inset-0 bg-red-500/5 rounded-[2rem] blur-xl" />
                            <div className="relative glass-card bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem]">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20 animate-pulse">
                                        <AlertCircle size={24} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-red-400">Emergency & Priority</h3>
                                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">Issue with essential items like <strong>Medicines</strong>, <strong>Water</strong>, or <strong>Personal Care</strong>? Our priority team will resolve this within <strong>5 Minutes</strong>.</p>
                                        <div className="flex gap-2 pt-2">
                                            <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-[9px] font-black tracking-widest">5 MIN SLA</Badge>
                                            <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] font-black tracking-widest">TOP PRIORITY</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* 7. FAQs & HELP TOPICS */}
                        <section>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 px-1">Common Questions</h2>
                            <div className="space-y-4">
                                {filteredFAQs.map((group, idx) => (
                                    <div key={idx} className="space-y-3">
                                        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1">{group.title}</h3>
                                        {group.items.map((item, id) => (
                                            <motion.div
                                                key={id}
                                                initial={false}
                                                className="glass-card overflow-hidden border border-white/5"
                                            >
                                                <details className="group">
                                                    <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                                                        <span className="text-sm font-bold group-open:text-primary transition-colors pr-4">{item.q}</span>
                                                        <ChevronRight className="text-muted-foreground group-open:rotate-90 transition-transform" size={16} />
                                                    </summary>
                                                    <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed font-medium">
                                                        {item.a}
                                                    </div>
                                                </details>
                                            </motion.div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </section>

                    </TabsContent>

                    {/* TICKETS TAB */}
                    <TabsContent value="tickets" className="space-y-8 focus-visible:outline-none">
                        {/* 5. SUPPORT TICKETS LIST */}
                        <section>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Your Tickets</h2>
                                <Button
                                    onClick={() => setShowNewTicketForm(true)}
                                    className="bg-primary hover:bg-primary/90 text-white text-[10px] font-bold uppercase tracking-wider rounded-xl h-9"
                                >
                                    <Plus size={14} className="mr-2" /> New Ticket
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {tickets.length > 0 ? (
                                    tickets.map((ticket) => (
                                        <div key={ticket.id} className="glass-card p-6 border border-white/5 relative group">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-10 h-10 rounded-xl flex items-center justify-center",
                                                        ticket.status === 'resolved' ? "bg-lime/20 text-lime" : "bg-primary/20 text-primary"
                                                    )}>
                                                        <Ticket size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm tracking-tight capitalize">{(ticket.category || 'issue').replace(/_/g, ' ')}</h4>
                                                        <p className="text-[10px] text-muted-foreground">ID: #{ticket.id.slice(0, 8).toUpperCase()}</p>
                                                    </div>
                                                </div>
                                                <Badge className={cn(
                                                    "uppercase text-[9px] font-black px-3 py-1 tracking-widest",
                                                    ticket.status === 'pending' ? "bg-amber-500" :
                                                        ticket.status === 'investigating' ? "bg-blue-500" :
                                                            (ticket.status === 'resolved' || ticket.status === 'refunded') ? "bg-lime text-black" : "bg-muted text-muted-foreground"
                                                )}>
                                                    {ticket.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-medium line-clamp-2 mb-4 leading-relaxed">
                                                {ticket.description}
                                            </p>
                                            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <Clock size={12} /> Last updated: {new Date(ticket.created_at).toLocaleDateString()}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedTicket(ticket)}
                                                    className="text-[10px] font-bold uppercase tracking-wider h-auto p-0 flex items-center gap-1 text-primary hover:text-primary/80"
                                                >
                                                    View Details <ArrowUpRight size={12} />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-16 glass-card border-dashed">
                                        <Ticket size={40} className="mx-auto text-muted-foreground/20 mb-4" />
                                        <p className="text-sm text-muted-foreground font-medium">No open tickets at the moment</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </TabsContent>

                    {/* REFUNDS TAB */}
                    <TabsContent value="refunds" className="space-y-8 focus-visible:outline-none">
                        {/* 6. REFUND & RESOLUTION CENTER */}
                        <section className="space-y-6">
                            <div className="glass-card bg-primary/5 border border-primary/20 p-6 rounded-[2rem]">
                                <h3 className="text-lg font-bold tracking-tight mb-4 flex items-center gap-2">
                                    <CreditCard className="text-primary" size={20} /> Refund Policy
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <CheckCircle2 size={16} className="text-lime mt-1" />
                                        <div>
                                            <p className="font-bold text-sm mb-1">Instant Wallet Refunds</p>
                                            <p className="text-xs text-muted-foreground">Refunds to SNACKZO wallet are processed within <strong>5 minutes</strong> of resolution.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <CheckCircle2 size={16} className="text-lime mt-1" />
                                        <div>
                                            <p className="font-bold text-sm mb-1">UPI/Bank Refunds</p>
                                            <p className="text-xs text-muted-foreground">Direct bank/UPI transfers take <strong>2-3 business days</strong> depending on your bank.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Refund History</h2>
                                <div className="glass-card p-6 border border-white/5 flex flex-col items-center justify-center text-center py-12">
                                    <Droplets size={40} className="text-muted-foreground/20 mb-4" />
                                    <h4 className="text-sm font-bold mb-1">No Recent Refunds</h4>
                                    <p className="text-xs text-muted-foreground font-medium">Any refund transactions will appear here.</p>
                                </div>
                            </div>
                        </section>
                    </TabsContent>
                </Tabs>

                {/* 9. FEEDBACK & TRUST SECTION */}
                <section className="mt-20 pt-10 border-t border-white/5 space-y-10">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="glass-card p-6 border border-white/5 text-center">
                            <p className="text-2xl font-bold mb-1">~4 mins</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Avg Response Time</p>
                        </div>
                        <div className="glass-card p-6 border border-white/5 text-center">
                            <p className="text-2xl font-bold mb-1">99.8%</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Refund Success Rate</p>
                        </div>
                    </div>

                    <div className="text-center space-y-4">
                        <div className="flex justify-center gap-1">
                            {Array(5).fill(0).map((_, i) => <Star key={i} size={20} className="fill-yellow-500 text-yellow-500" />)}
                        </div>
                        <p className="text-sm font-bold tracking-tight italic">"The fastest support in the hostel! Got my missing maggi refund in 2 mins."</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest tracking-widest opacity-40">- Satisfied Roomie from Block B</p>
                    </div>
                </section>

                <p className="text-center text-[10px] text-muted-foreground/30 uppercase font-bold tracking-widest mt-20 mb-8 flex items-center justify-center gap-2">
                    <ShieldCheck size={12} /> SECURE ENTERPRISE SUPPORT HUB
                </p>
            </main>

            {/* 4. AI CHAT + HUMAN SUPPORT WIDGET (Simulated) */}
            <AnimatePresence>
                {isChatOpen && (
                    <div className="fixed inset-0 z-[60] flex flex-col md:items-end md:justify-end md:p-8">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsChatOpen(false)}
                            className="absolute inset-0 bg-background/60 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 100, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 100, scale: 0.95 }}
                            className="relative w-full h-full md:w-[400px] md:h-[600px] bg-card/90 backdrop-blur-3xl border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] md:rounded-[2.5rem] flex flex-col overflow-hidden"
                        >
                            {/* Chat Header */}
                            <div className="p-6 bg-primary/20 border-b border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                        <Droplets size={22} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm tracking-tight">SNACKZO AI</h4>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-lime rounded-full animate-pulse" />
                                            <span className="text-[10px] font-bold text-lime uppercase tracking-wider">Online & Responsive</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsChatOpen(false)}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                                >
                                    <ArrowLeft size={18} className="rotate-[-90deg] md:rotate-0" />
                                </button>
                            </div>

                            {/* Chat Content */}
                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-6">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center shrink-0"><Zap size={14} className="text-primary" /></div>
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                                            <p className="text-xs font-medium leading-relaxed">Hey there! I'm your snack support AI. 🚀 I can help with missing items, refunds, or even suggest a great late-night craving! What's up?</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pl-11">
                                        <Button variant="outline" className="justify-start border-white/5 bg-white/5 hover:bg-primary/20 hover:border-primary/50 text-[11px] font-bold rounded-xl h-10 transition-all">Report a Missing Item</Button>
                                        <Button variant="outline" className="justify-start border-white/5 bg-white/5 hover:bg-primary/20 hover:border-primary/50 text-[11px] font-bold rounded-xl h-10 transition-all">Where is my Order?</Button>
                                        <Button variant="outline" className="justify-start border-white/5 bg-white/5 hover:bg-primary/20 hover:border-primary/50 text-[11px] font-bold rounded-xl h-10 transition-all">Talk to a Human Hero</Button>
                                    </div>
                                </div>
                            </ScrollArea>

                            {/* Chat Input */}
                            <div className="p-6 bg-white/5 border-t border-white/10">
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        placeholder="Type your message..."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 pr-14 outline-none focus:border-primary/50 transition-all text-sm font-medium"
                                    />
                                    <button className="absolute right-2 w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                                        <Send size={18} />
                                    </button>
                                </div>
                                <p className="text-[9px] text-center text-muted-foreground/40 font-bold uppercase tracking-[0.2em] mt-3">Human agents respond in ~2 mins</p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ISSUE SELECTION MODAL (Simulated) */}
            <AnimatePresence>
                {showIssueModal && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIssueModal(null)} className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-sm glass-card bg-card border border-white/10 p-8 rounded-[2.5rem] shadow-2xl"
                        >
                            <h3 className="text-xl font-bold tracking-tight mb-2">What happened?</h3>
                            <p className="text-xs text-muted-foreground mb-6">Select an issue with order #{showIssueModal.slice(0, 8).toUpperCase()}</p>

                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { label: 'Order Delayed', icon: Clock },
                                    { label: 'Missing / Wrong Items', icon: AlertCircle },
                                    { label: 'Damaged Products', icon: XCircle },
                                    { label: 'Delivery Partner Issue', icon: User },
                                    { label: 'Refund Request', icon: CreditCard },
                                ].map((item) => (
                                    <button key={item.label} className="w-full p-4 glass-card border border-white/5 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-between transition-all group">
                                        <div className="flex items-center gap-3">
                                            <item.icon size={18} className="text-primary group-hover:scale-110 transition-all" />
                                            <span className="text-xs font-bold">{item.label}</span>
                                        </div>
                                        <ChevronRight size={14} className="text-muted-foreground" />
                                    </button>
                                ))}
                            </div>

                            <button onClick={() => setShowIssueModal(null)} className="w-full mt-6 py-4 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* NEW TICKET FORM MODAL */}
            <AnimatePresence>
                {showNewTicketForm && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewTicketForm(false)} className="absolute inset-0 bg-background/80 backdrop-blur-xl" />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-md glass-card bg-card border border-white/10 p-8 rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold tracking-tight">Raise a Ticket</h3>
                                <Badge className="bg-primary/10 text-primary border-primary/20">NEW ISSUE</Badge>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">What happened?</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { value: 'missing_item', label: 'Missing Item' },
                                            { value: 'wrong_item', label: 'Wrong Item' },
                                            { value: 'late_delivery', label: 'Late Delivery' },
                                            { value: 'damaged_item', label: 'Damaged Item' },
                                            { value: 'wrong_quantity', label: 'Wrong Quantity' },
                                            { value: 'quality_issue', label: 'Quality Issue' },
                                            { value: 'rude_behavior', label: 'Rude Behavior' },
                                            { value: 'other', label: 'Other' }
                                        ].map(cat => (
                                            <button
                                                key={cat.value}
                                                onClick={() => setTicketData({ ...ticketData, category: cat.value as typeof ticketData.category })}
                                                className={cn(
                                                    "py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all",
                                                    ticketData.category === cat.value ? "bg-primary text-white border-primary" : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10"
                                                )}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Select Order <span className="text-red-500">*</span></label>
                                    <select
                                        value={ticketData.order_id}
                                        onChange={(e) => setTicketData({ ...ticketData, order_id: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none focus:border-primary/50 text-sm font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-card text-muted-foreground">-- Select an order --</option>
                                        {recentOrders.map((order) => (
                                            <option key={order.id} value={order.id} className="bg-card">
                                                #{order.id.slice(0, 8).toUpperCase()} • {new Date(order.created_at).toLocaleDateString()} • ₹{order.total} • {order.status}
                                            </option>
                                        ))}
                                    </select>
                                    {recentOrders.length === 0 && (
                                        <p className="text-[10px] text-amber-500">No orders found. You need to place an order first.</p>
                                    )}
                                    {recentOrders.length > 0 && (
                                        <p className="text-[10px] text-muted-foreground">Select the order you're having an issue with.</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Issue Description <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={ticketData.description}
                                        onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 min-h-[120px] outline-none focus:border-primary/50 text-sm font-medium"
                                        placeholder="Describe the issue in detail..."
                                    />
                                </div>

                                <div className="pt-4 flex flex-col gap-3">
                                    <Button
                                        onClick={handleSubmitTicket}
                                        disabled={isSubmitting || !ticketData.description}
                                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-xl shadow-primary/20"
                                    >
                                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Ticket ✨"}
                                    </Button>
                                    <button
                                        onClick={() => setShowNewTicketForm(false)}
                                        className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TICKET DETAILS MODAL */}
            <AnimatePresence>
                {selectedTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-lg bg-card border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-primary via-purple-600 to-secondary p-6 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                                <div className="relative flex items-center justify-between">
                                    <div>
                                        <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">
                                            Ticket Details
                                        </p>
                                        <h3 className="text-xl font-bold text-white">
                                            #{selectedTicket.id.slice(0, 8).toUpperCase()}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</span>
                                    <Badge className={cn(
                                        "uppercase text-[10px] font-black px-4 py-1.5 tracking-widest",
                                        selectedTicket.status === 'pending' ? "bg-amber-500" :
                                            selectedTicket.status === 'investigating' ? "bg-blue-500" :
                                                selectedTicket.status === 'resolved' ? "bg-lime text-black" :
                                                    selectedTicket.status === 'refunded' ? "bg-green-500" : "bg-muted"
                                    )}>
                                        {selectedTicket.status}
                                    </Badge>
                                </div>

                                {/* Category */}
                                <div className="glass-card p-4 border border-white/5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Issue Type</p>
                                    <p className="text-lg font-bold capitalize">{(selectedTicket.category || 'Other').replace(/_/g, ' ')}</p>
                                </div>

                                {/* Description */}
                                <div className="glass-card p-4 border border-white/5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Description</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{selectedTicket.description}</p>
                                </div>

                                {/* Order ID */}
                                {selectedTicket.order_id && (
                                    <div className="glass-card p-4 border border-white/5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Related Order</p>
                                        <button
                                            onClick={() => {
                                                setSelectedTicket(null);
                                                navigate(`/orders/${selectedTicket.order_id}`);
                                            }}
                                            className="text-sm font-bold text-primary hover:underline flex items-center gap-2"
                                        >
                                            #{selectedTicket.order_id.slice(0, 8).toUpperCase()}
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </div>
                                )}

                                {/* Resolution Notes (if resolved) */}
                                {(selectedTicket.status === 'resolved' || selectedTicket.status === 'refunded') && selectedTicket.resolution_notes && (
                                    <div className="glass-card p-4 border border-lime/20 bg-lime/5">
                                        <p className="text-[10px] font-bold text-lime uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <CheckCircle2 size={14} /> Resolution
                                        </p>
                                        <p className="text-sm text-foreground/80 leading-relaxed">{selectedTicket.resolution_notes}</p>
                                    </div>
                                )}

                                {/* Refund Amount (if refunded) */}
                                {selectedTicket.status === 'refunded' && selectedTicket.refund_amount && (
                                    <div className="glass-card p-4 border border-green-500/20 bg-green-500/5">
                                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Wallet size={14} /> Refund Credited
                                        </p>
                                        <p className="text-2xl font-bold text-green-500">₹{selectedTicket.refund_amount.toFixed(2)}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Added to your wallet balance</p>
                                    </div>
                                )}

                                {/* Timeline */}
                                <div className="glass-card p-4 border border-white/5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-4">Timeline</p>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-3 h-3 rounded-full bg-primary mt-1" />
                                            <div>
                                                <p className="text-xs font-bold">Ticket Created</p>
                                                <p className="text-[10px] text-muted-foreground">{new Date(selectedTicket.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        {selectedTicket.status !== 'pending' && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                                                <div>
                                                    <p className="text-xs font-bold">Under Investigation</p>
                                                    <p className="text-[10px] text-muted-foreground">Admin is reviewing your issue</p>
                                                </div>
                                            </div>
                                        )}
                                        {(selectedTicket.status === 'resolved' || selectedTicket.status === 'refunded') && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-3 h-3 rounded-full bg-lime mt-1" />
                                                <div>
                                                    <p className="text-xs font-bold">Resolved</p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {selectedTicket.resolved_at
                                                            ? new Date(selectedTicket.resolved_at).toLocaleString()
                                                            : 'Issue has been resolved'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Created: {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                                    {selectedTicket.updated_at && (
                                        <span>Updated: {new Date(selectedTicket.updated_at).toLocaleDateString()}</span>
                                    )}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t border-white/5 bg-black/20">
                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => setSelectedTicket(null)}
                                        className="flex-1 h-12 bg-white/5 hover:bg-white/10 border border-white/10"
                                    >
                                        Close
                                    </Button>
                                    {selectedTicket.status === 'pending' && (
                                        <Button
                                            onClick={() => setIsChatOpen(true)}
                                            className="flex-1 h-12 bg-primary hover:bg-primary/90"
                                        >
                                            <MessageCircle size={16} className="mr-2" />
                                            Contact Support
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Support;
