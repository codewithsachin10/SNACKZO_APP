import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, Clock, Package, Truck, Check, X, ChevronDown, 
  Filter, Download, Search, MapPin, Receipt, Star, ArrowRight
} from "lucide-react";
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { OrderListSkeleton } from "./ui/Skeletons";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  product_image?: string;
}

interface Order {
  id: string;
  status: "placed" | "packed" | "out_for_delivery" | "delivered" | "cancelled";
  total: number;
  created_at: string;
  delivered_at?: string;
  delivery_address: string;
  payment_method: string;
  items: OrderItem[];
  runner_name?: string;
  rating?: number;
}

interface OrderHistoryTimelineProps {
  limit?: number;
  showFilters?: boolean;
  onOrderClick?: (orderId: string) => void;
}

export function OrderHistoryTimeline({
  limit,
  showFilters = true,
  onOrderClick
}: OrderHistoryTimelineProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items(id, product_name, quantity, price)
      `)
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data.map((order: any) => ({
        ...order,
        items: order.order_items || []
      })));
    }
    setIsLoading(false);
  };

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      filtered = filtered.filter(o => {
        const date = parseISO(o.created_at);
        switch (dateFilter) {
          case "today": return isToday(date);
          case "week": return isThisWeek(date);
          case "month": return isThisMonth(date);
          default: return true;
        }
      });
    }

    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(query) ||
        o.items.some(item => item.product_name.toLowerCase().includes(query))
      );
    }

    // Limit
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [orders, statusFilter, dateFilter, searchQuery, limit]);

  // Group orders by date
  const groupedOrders = useMemo(() => {
    const groups: { [key: string]: Order[] } = {};
    
    filteredOrders.forEach(order => {
      const date = parseISO(order.created_at);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = "Today";
      } else if (isYesterday(date)) {
        groupKey = "Yesterday";
      } else if (isThisWeek(date)) {
        groupKey = "This Week";
      } else if (isThisMonth(date)) {
        groupKey = "This Month";
      } else {
        groupKey = format(date, "MMMM yyyy");
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(order);
    });
    
    return groups;
  }, [filteredOrders]);

  const statusColors: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    placed: { bg: "bg-blue-500/10", text: "text-blue-500", icon: Clock },
    packed: { bg: "bg-yellow-500/10", text: "text-yellow-500", icon: Package },
    out_for_delivery: { bg: "bg-purple-500/10", text: "text-purple-500", icon: Truck },
    delivered: { bg: "bg-green-500/10", text: "text-green-500", icon: Check },
    cancelled: { bg: "bg-red-500/10", text: "text-red-500", icon: X }
  };

  const exportOrders = () => {
    const csvContent = [
      ["Order ID", "Date", "Status", "Total", "Items"],
      ...filteredOrders.map(o => [
        o.id,
        format(parseISO(o.created_at), "yyyy-MM-dd HH:mm"),
        o.status,
        o.total,
        o.items.map(i => `${i.product_name} x${i.quantity}`).join("; ")
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  if (isLoading) {
    return <OrderListSkeleton count={3} />;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl border-none focus:ring-2 focus:ring-primary outline-none"
            />
          </div>

          {/* Filter buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg shrink-0 transition-colors",
                showFilterPanel ? "bg-primary text-primary-foreground" : "bg-muted"
              )}
            >
              <Filter size={16} />
              Filters
            </button>
            
            {/* Quick status filters */}
            {["delivered", "out_for_delivery", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm capitalize shrink-0 transition-colors",
                  statusFilter === status
                    ? `${statusColors[status].bg} ${statusColors[status].text}`
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {status.replace("_", " ")}
              </button>
            ))}

            {/* Export button */}
            <button
              onClick={exportOrders}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors shrink-0 ml-auto"
            >
              <Download size={16} />
              Export
            </button>
          </div>

          {/* Expanded filter panel */}
          <AnimatePresence>
            {showFilterPanel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Date Range</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "all", label: "All Time" },
                        { value: "today", label: "Today" },
                        { value: "week", label: "This Week" },
                        { value: "month", label: "This Month" }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setDateFilter(option.value as any)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-sm transition-colors",
                            dateFilter === option.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-background hover:bg-background/80"
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {Object.entries(groupedOrders).length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {searchQuery || statusFilter || dateFilter !== "all"
                ? "Try adjusting your filters"
                : "Your order history will appear here"
              }
            </p>
          </div>
        ) : (
          Object.entries(groupedOrders).map(([groupName, groupOrders]) => (
            <div key={groupName}>
              {/* Group header */}
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{groupName}</span>
                <span className="text-xs text-muted-foreground">({groupOrders.length})</span>
              </div>

              {/* Timeline line */}
              <div className="relative pl-8 space-y-4">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-border" />

                {groupOrders.map((order, index) => {
                  const StatusIcon = statusColors[order.status]?.icon || Package;
                  const isExpanded = expandedOrder === order.id;

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative"
                    >
                      {/* Timeline dot */}
                      <div className={cn(
                        "absolute -left-8 top-4 w-6 h-6 rounded-full flex items-center justify-center",
                        statusColors[order.status]?.bg || "bg-muted"
                      )}>
                        <StatusIcon size={12} className={statusColors[order.status]?.text} />
                      </div>

                      {/* Order card */}
                      <motion.div
                        className="glass-card overflow-hidden"
                        whileHover={{ scale: 1.01 }}
                      >
                        {/* Card header */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-muted-foreground">
                                  #{order.id.slice(0, 8)}
                                </span>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-xs capitalize",
                                  statusColors[order.status]?.bg,
                                  statusColors[order.status]?.text
                                )}>
                                  {order.status.replace("_", " ")}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(parseISO(order.created_at), "h:mm a")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">₹{order.total}</p>
                              <p className="text-xs text-muted-foreground">
                                {order.items.length} items
                              </p>
                            </div>
                          </div>

                          {/* Quick item preview */}
                          <div className="flex items-center gap-2 mt-3">
                            <div className="flex -space-x-2">
                              {order.items.slice(0, 3).map((item, i) => (
                                <div
                                  key={item.id}
                                  className="w-8 h-8 rounded-lg bg-muted border-2 border-background overflow-hidden"
                                >
                                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <div className="w-8 h-8 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                                  +{order.items.length - 3}
                                </div>
                              )}
                            </div>
                            <span className="text-sm text-muted-foreground truncate flex-1">
                              {order.items.map(i => i.product_name).slice(0, 2).join(", ")}
                              {order.items.length > 2 && "..."}
                            </span>
                            <ChevronDown
                              size={18}
                              className={cn("transition-transform", isExpanded && "rotate-180")}
                            />
                          </div>
                        </div>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-2 border-t border-border space-y-4">
                                {/* Items list */}
                                <div className="space-y-2">
                                  {order.items.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">x{item.quantity}</span>
                                        <span>{item.product_name}</span>
                                      </div>
                                      <span className="font-medium">₹{item.price * item.quantity}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Delivery info */}
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <MapPin size={14} />
                                  <span>{order.delivery_address}</span>
                                </div>

                                {/* Rating (if delivered) */}
                                {order.status === "delivered" && order.rating && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Your rating:</span>
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          size={14}
                                          className={star <= order.rating! ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => onOrderClick?.(order.id)}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                  >
                                    View Details
                                    <ArrowRight size={16} />
                                  </button>
                                  <button
                                    onClick={() => {/* Reorder */}}
                                    className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                                  >
                                    <Receipt size={16} />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
