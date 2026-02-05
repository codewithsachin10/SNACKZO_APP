import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Download, TrendingUp, Calendar, Package, Star, Clock, DollarSign, BarChart3, Users, Eye, Activity, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  user_id: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  order_id: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
}

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

const COLORS = ["hsl(270, 100%, 65%)", "hsl(180, 100%, 50%)", "hsl(330, 100%, 65%)", "hsl(120, 100%, 50%)", "hsl(45, 100%, 50%)"];

const AdvancedAnalytics = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedCategory, setSelectedCategory] = useState("");

  // Live visitors tracking
  const [liveVisitors, setLiveVisitors] = useState(0);
  const [todayVisitors, setTodayVisitors] = useState(0);
  const [totalPageViews, setTotalPageViews] = useState(0);

  // Fetch live visitors count
  const fetchVisitorStats = async () => {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const todayStart = new Date(now.setHours(0, 0, 0, 0));

      // Live visitors (unique sessions in last 5 minutes)
      const { data: liveData } = await supabase
        .from("page_views")
        .select("session_id")
        .gte("created_at", fiveMinutesAgo.toISOString());

      const uniqueLiveSessions = new Set(liveData?.map(v => v.session_id) || []);
      setLiveVisitors(uniqueLiveSessions.size);

      // Today's unique visitors
      const { data: todayData } = await supabase
        .from("page_views")
        .select("session_id")
        .gte("created_at", todayStart.toISOString());

      const uniqueTodaySessions = new Set(todayData?.map(v => v.session_id) || []);
      setTodayVisitors(uniqueTodaySessions.size);

      // Total page views in date range
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const { count } = await supabase
        .from("page_views")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString());

      setTotalPageViews(count || 0);
    } catch (error) {
      console.debug("Visitor stats error:", error);
    }
  };

  // Real-time subscription for live visitors
  useEffect(() => {
    fetchVisitorStats();

    // Refresh live count every 30 seconds
    const interval = setInterval(fetchVisitorStats, 30000);

    // Subscribe to real-time page views
    const channel = supabase
      .channel("live-visitors")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "page_views" }, () => {
        fetchVisitorStats();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setIsLoading(true);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const [ordersRes, itemsRes, productsRes, categoriesRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .neq("status", "cancelled"),
      supabase
        .from("order_items")
        .select("*")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString()),
      supabase.from("products").select("*"),
      supabase.from("categories").select("*"),
    ]);

    if (ordersRes.data) setOrders(ordersRes.data);
    if (itemsRes.data) setOrderItems(itemsRes.data);
    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    setIsLoading(false);
  };

  const analytics = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== "cancelled");
    const totalRevenue = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalOrders = validOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const uniqueCustomers = new Set(validOrders.map((o) => o.user_id)).size;

    // Category-wise breakdown
    const categorySales: Record<string, { revenue: number; quantity: number; name: string }> = {};

    orderItems.forEach((item) => {
      const product = products.find((p) => p.id === item.product_id);
      if (product) {
        const category = categories.find((c) => c.id === product.category_id);
        const categoryName = category?.name || "Uncategorized";

        if (!categorySales[categoryName]) {
          categorySales[categoryName] = { revenue: 0, quantity: 0, name: categoryName };
        }

        categorySales[categoryName].revenue += Number(item.price) * item.quantity;
        categorySales[categoryName].quantity += item.quantity;
      }
    });

    const sortedCategorySales = Object.values(categorySales).sort(
      (a, b) => b.revenue - a.revenue
    );

    // Popular products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orderItems.forEach((item) => {
      if (!productSales[item.product_id]) {
        productSales[item.product_id] = { name: item.product_name, quantity: 0, revenue: 0 };
      }
      productSales[item.product_id].quantity += item.quantity;
      productSales[item.product_id].revenue += Number(item.price) * item.quantity;
    });
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Retention - customers with repeat orders
    const customerOrderCounts: Record<string, number> = {};
    validOrders.forEach((order) => {
      customerOrderCounts[order.user_id] = (customerOrderCounts[order.user_id] || 0) + 1;
    });

    const repeatCustomers = Object.values(customerOrderCounts).filter((count) => count > 1).length;
    const retentionRate =
      uniqueCustomers > 0 ? ((repeatCustomers / uniqueCustomers) * 100).toFixed(1) : "0";

    // Peak hours - full breakdown
    const hourlyBreakdown: Record<number, { count: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyBreakdown[i] = { count: 0, revenue: 0 };
    }
    validOrders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hourlyBreakdown[hour].count += 1;
      hourlyBreakdown[hour].revenue += Number(order.total);
    });

    const hourlyData = Object.entries(hourlyBreakdown).map(([hour, data]) => ({
      hour: `${hour}:00`,
      orders: data.count,
      revenue: data.revenue,
    }));

    const peakHour = Object.entries(hourlyBreakdown).reduce(
      (max, [hour, data]) => (data.count > max[1] ? [parseInt(hour), data.count] : max),
      [0, 0]
    );

    // Daily revenue trend
    const dailyRevenue: Record<string, { date: string; revenue: number; orders: number }> = {};
    validOrders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, orders: 0 };
      }
      dailyRevenue[date].revenue += Number(order.total);
      dailyRevenue[date].orders += 1;
    });
    const revenueData = Object.values(dailyRevenue).sort((a, b) => a.date.localeCompare(b.date));

    // Delivery and Cancel rates (from all orders, not just valid)
    const allOrders = orders;
    const deliveredCount = allOrders.filter(o => o.status === "delivered").length;
    const cancelledCount = allOrders.filter(o => o.status === "cancelled").length;
    const deliveryRate = allOrders.length > 0 ? (deliveredCount / allOrders.length) * 100 : 0;
    const cancelRate = allOrders.length > 0 ? (cancelledCount / allOrders.length) * 100 : 0;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      uniqueCustomers,
      repeatCustomers,
      retentionRate,
      categorySales: sortedCategorySales,
      topProducts,
      hourlyData,
      revenueData,
      peakHour: peakHour[0],
      peakHourOrders: peakHour[1],
      deliveryRate,
      cancelRate,
    };
  }, [orders, orderItems, products, categories]);

  const filteredCategorySales = useMemo(() => {
    if (!selectedCategory) return analytics.categorySales;
    return analytics.categorySales.filter((c) => c.name === selectedCategory);
  }, [analytics.categorySales, selectedCategory]);

  const exportReport = () => {
    const headers = [
      "Date Range",
      "Total Revenue",
      "Total Orders",
      "Unique Customers",
      "Avg Order Value",
      "Retention Rate",
    ];

    const data = [
      [
        `${startDate} to ${endDate}`,
        `₹${analytics.totalRevenue.toFixed(2)}`,
        analytics.totalOrders,
        analytics.uniqueCustomers,
        `₹${analytics.avgOrderValue.toFixed(2)}`,
        `${analytics.retentionRate}%`,
      ],
    ];

    const categoryHeaders = ["Category", "Revenue", "Quantity Sold"];
    const categoryData = analytics.categorySales.map((cat) => [
      cat.name,
      `₹${cat.revenue.toFixed(2)}`,
      cat.quantity,
    ]);

    const productHeaders = ["Product", "Quantity Sold", "Revenue"];
    const productData = analytics.topProducts.map((p) => [
      p.name,
      p.quantity,
      `₹${p.revenue.toFixed(2)}`,
    ]);

    const csv = [
      headers.join(","),
      ...data.map((r) => r.join(",")),
      "",
      categoryHeaders.join(","),
      ...categoryData.map((r) => r.join(",")),
      "",
      productHeaders.join(","),
      ...productData.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${startDate}-${endDate}.csv`;
    a.click();
    toast.success("Report exported");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="glass-card p-4 flex gap-4 flex-wrap items-end">
        <div>
          <label className="text-sm font-medium">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 glass-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="text-sm font-medium">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 glass-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={exportReport}
          className="glass-card px-4 py-2 flex items-center gap-2 text-sm hover:bg-muted/50"
        >
          <Download size={16} />
          Export Report
        </button>
      </div>

      {/* 🟢 LIVE VISITORS - Hero Section */}
      <div className="glass-card p-6 bg-gradient-to-br from-lime/10 via-transparent to-primary/10 border-lime/20 relative overflow-hidden">
        <div className="absolute top-4 right-4">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime"></span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Live Now */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
              <Activity size={20} className="text-lime animate-pulse" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Live Now</span>
            </div>
            <p className="text-5xl md:text-6xl font-bold text-lime">{liveVisitors}</p>
            <p className="text-sm text-muted-foreground mt-1">visitors in last 5 min</p>
          </div>

          {/* Today's Visitors */}
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Users size={20} className="text-secondary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Today</span>
            </div>
            <p className="text-4xl font-bold text-secondary">{todayVisitors}</p>
            <p className="text-sm text-muted-foreground mt-1">unique visitors</p>
          </div>

          {/* Page Views in Range */}
          <div className="text-center md:text-right">
            <div className="flex items-center gap-2 justify-center md:justify-end mb-2">
              <Eye size={20} className="text-primary" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Page Views</span>
            </div>
            <p className="text-4xl font-bold text-primary">{totalPageViews.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">in selected period</p>
          </div>
        </div>
      </div>

      {/* Key Metrics - Expanded Grid */}
      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4">
          <DollarSign size={20} className="text-lime mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Revenue</p>
          <p className="text-2xl font-bold text-lime">₹{analytics.totalRevenue.toFixed(0)}</p>
          <p className="text-xs text-muted-foreground mt-2">{analytics.totalOrders} orders</p>
        </div>
        <div className="glass-card p-4">
          <BarChart3 size={20} className="text-primary mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Avg Order</p>
          <p className="text-2xl font-bold">₹{analytics.avgOrderValue.toFixed(0)}</p>
        </div>
        <div className="glass-card p-4">
          <TrendingUp size={20} className="text-secondary mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Customers</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-bold">{analytics.uniqueCustomers}</p>
            <p className="text-xs text-lime">{analytics.repeatCustomers} repeat</p>
          </div>
        </div>
        <div className="glass-card p-4">
          <Star size={20} className="text-accent mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Retention</p>
          <p className="text-2xl font-bold text-secondary">{analytics.retentionRate}%</p>
        </div>
        <div className="glass-card p-4">
          <CheckCircle size={20} className="text-lime mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Delivery Rate</p>
          <p className="text-2xl font-bold text-lime">{analytics.deliveryRate.toFixed(1)}%</p>
        </div>
        <div className="glass-card p-4">
          <XCircle size={20} className="text-destructive mb-2" />
          <p className="text-sm text-muted-foreground mb-1">Cancel Rate</p>
          <p className="text-2xl font-bold text-destructive">{analytics.cancelRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={18} />
          Revenue Trend
        </h3>
        {analytics.revenueData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={analytics.revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelFormatter={(date) => new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                formatter={(value: number) => [`₹${value.toFixed(0)}`, "Revenue"]}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="hsl(120, 100%, 50%)"
                strokeWidth={3}
                dot={{ fill: "hsl(120, 100%, 50%)", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-muted-foreground text-center py-8">No data for selected period</p>
        )}
      </div>

      {/* Peak Hours Chart */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Clock size={18} />
          Peak Hours Analysis
        </h3>
        <div className="mb-4 text-center">
          <p className="text-sm text-muted-foreground">Most active hour</p>
          <p className="text-3xl font-bold text-primary">
            {analytics.peakHour}:00 - {analytics.peakHour + 1}:00
          </p>
          <p className="text-sm text-muted-foreground">
            {analytics.peakHourOrders} orders during this hour
          </p>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics.hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={10} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="orders" fill="hsl(270, 100%, 65%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Products */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Star size={18} />
          Popular Products (Top 10)
        </h3>
        {analytics.topProducts.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              {analytics.topProducts.slice(0, 5).map((product, idx) => (
                <div key={product.name} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? "bg-lime text-lime-foreground" :
                      idx === 1 ? "bg-secondary text-secondary-foreground" :
                        idx === 2 ? "bg-accent text-accent-foreground" :
                          "bg-muted text-muted-foreground"
                      }`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                    </div>
                  </div>
                  <span className="font-bold text-lime">₹{product.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              {analytics.topProducts.slice(5, 10).map((product, idx) => (
                <div key={product.name} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm">
                      #{idx + 6}
                    </span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                    </div>
                  </div>
                  <span className="font-bold text-lime">₹{product.revenue.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">No product data for selected period</p>
        )}
      </div>

      {/* Category Sales with Pie Chart */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Package size={18} />
            Sales by Category
          </h3>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="glass-card px-3 py-1 text-sm focus:outline-none"
          >
            <option value="">All Categories</option>
            {analytics.categorySales.map((cat) => (
              <option key={cat.name} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="glass-card p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={analytics.categorySales}
                  dataKey="revenue"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {analytics.categorySales.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`₹${value.toFixed(0)}`, "Revenue"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Category Cards */}
          <div className="grid gap-3">
            {filteredCategorySales.map((category, idx) => {
              const avgPrice = category.quantity > 0 ? (category.revenue / category.quantity).toFixed(0) : 0;

              return (
                <div key={category.name} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    />
                    <div>
                      <p className="font-bold">{category.name}</p>
                      <p className="text-xs text-muted-foreground">{category.quantity} items sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lime">₹{category.revenue.toFixed(0)}</p>
                    <p className="text-xs text-muted-foreground">Avg: ₹{avgPrice}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
