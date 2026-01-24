import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Filter, Check, Truck, Home, X, Package, Clock } from "lucide-react";

// Redefine types locally or import them if you have a shared types file
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

interface OrdersManagementProps {
    orders: Order[];
    runners: Runner[];
    isLoading: boolean;
    onUpdateStatus: (orderId: string, status: Order["status"]) => Promise<void>;
    onAssignRunner: (orderId: string, runnerId: string | null) => Promise<void>;
}

const statusFlow: Order["status"][] = ["placed", "packed", "out_for_delivery", "delivered"];

export default function OrdersManagement({ orders, runners, isLoading, onUpdateStatus, onAssignRunner }: OrdersManagementProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

    // Sort orders: Active first, then by date
    // Active orders are those NOT delivered or cancelled
    const sortedOrders = [...orders].sort((a, b) => {
        const aIsActive = !["delivered", "cancelled"].includes(a.status);
        const bIsActive = !["delivered", "cancelled"].includes(b.status);
        if (aIsActive && !bIsActive) return -1;
        if (!aIsActive && bIsActive) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const filteredOrders = sortedOrders.filter(order => {
        const matchesSearch =
            order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.delivery_address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getNextStatus = (status: Order["status"]) => {
        const idx = statusFlow.indexOf(status);
        return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
    };

    const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    // Bulk update handler (if needed in future, logic is here)
    const handleBulkUpdate = async (status: Order["status"]) => {
        for (const id of selectedOrders) {
            await onUpdateStatus(id, status);
        }
        setSelectedOrders([]);
        toast.success(`Updated ${selectedOrders.length} orders`);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-background/50 p-4 rounded-xl border border-border/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <input
                        placeholder="Search by Order ID or Address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    {["all", "placed", "packed", "out_for_delivery", "delivered", "cancelled"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${statusFilter === status
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border hover:bg-muted"
                                }`}
                        >
                            {status.replace(/_/g, " ").toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Orders List */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="col-span-full text-center py-20 opacity-50">
                        <Package className="w-16 h-16 mx-auto mb-4 stroke-1" />
                        <p className="text-lg font-medium">No orders found</p>
                    </div>
                ) : (
                    filteredOrders.map(order => {
                        const next = getNextStatus(order.status);
                        const isDelivered = order.status === "delivered";
                        const isCancelled = order.status === "cancelled";
                        const isInactive = isDelivered || isCancelled;

                        return (
                            <div
                                key={order.id}
                                className={`group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${isInactive
                                    ? "bg-card/50 border-border/50 opacity-70 hover:opacity-100"
                                    : "bg-card border-border shadow-sm hover:shadow-md hover:border-primary/30"
                                    }`}
                            >
                                {/* Status Strip */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status === 'placed' ? 'bg-blue-500' :
                                    order.status === 'packed' ? 'bg-orange-500' :
                                        order.status === 'out_for_delivery' ? 'bg-yellow-500' :
                                            order.status === 'delivered' ? 'bg-green-500' : 'bg-red-500'
                                    }`} />

                                <div className="p-5 pl-7 flex-1 flex flex-col gap-4">
                                    {/* Header: ID, Time, Status */}
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded">
                                                #{order.id.slice(0, 8)}
                                            </span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatTime(order.created_at)}
                                            </span>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${order.status === 'placed' ? 'text-blue-500 border-blue-500/20 bg-blue-500/10' :
                                            order.status === 'packed' ? 'text-orange-500 border-orange-500/20 bg-orange-500/10' :
                                                order.status === 'out_for_delivery' ? 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10' :
                                                    order.status === 'delivered' ? 'text-green-500 border-green-500/20 bg-green-500/10' : 'text-red-500 border-red-500/20 bg-red-500/10'
                                            }`}>
                                            {order.status.replace(/_/g, " ")}
                                        </span>
                                    </div>

                                    {/* Address & Items */}
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight mb-2 line-clamp-1" title={order.delivery_address}>{order.delivery_address}</h3>
                                        <div className="space-y-1 bg-muted/30 p-3 rounded-lg border border-border/50">
                                            {order.items?.map(item => (
                                                <div key={item.id} className="flex justify-between text-sm text-foreground/80">
                                                    <span className="line-clamp-1">{item.quantity} × {item.product_name}</span>
                                                    <span>₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                            <div className="pt-2 mt-2 border-t border-dashed border-border flex justify-between items-center">
                                                <span className="text-xs font-bold uppercase text-muted-foreground">{order.payment_method}</span>
                                                <span className="font-bold text-base">₹{order.total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Controls: Runner & Actions */}
                                    <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Assigned Runner</label>
                                            <select
                                                value={order.runner_id || ""}
                                                onChange={(e) => onAssignRunner(order.id, e.target.value || null)}
                                                disabled={isInactive}
                                                className="w-full p-2 bg-muted/50 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all font-medium h-10"
                                            >
                                                <option value="">Select Runner</option>
                                                {runners.map(r => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name} {r.is_active ? `(${r.active_order_count ? `${r.active_order_count} active` : 'Free'})` : '(Offline)'}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 opacity-0">Action</label>
                                            <div className="flex gap-2 h-10">
                                                {next && !isInactive && (
                                                    <button
                                                        onClick={() => onUpdateStatus(order.id, next)}
                                                        className="flex-1 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm flex items-center justify-center gap-1.5 text-white"
                                                        style={{
                                                            backgroundColor:
                                                                next === 'packed' ? '#f97316' :
                                                                    next === 'out_for_delivery' ? '#eab308' :
                                                                        '#22c55e' // delivered
                                                        }}
                                                    >
                                                        <span>{next.replace(/_/g, " ")}</span>
                                                        {next === 'delivered' ? <Home size={14} /> : <Check size={14} />}
                                                    </button>
                                                )}

                                                {!isInactive && (
                                                    <button
                                                        onClick={() => onUpdateStatus(order.id, 'cancelled')}
                                                        className="px-3 rounded-lg font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all"
                                                        title="Cancel Order"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                )}

                                                {isInactive && (
                                                    <div className="w-full flex items-center justify-center rounded-lg bg-muted/50 text-xs font-bold text-muted-foreground uppercase border border-border/50">
                                                        {order.status}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
