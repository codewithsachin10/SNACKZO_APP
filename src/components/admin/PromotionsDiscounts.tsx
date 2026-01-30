import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Trash2, Edit2, Zap, Tag, Copy,
  Check, Calendar, BarChart3, ArrowRight, Wallet
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
  id: string;
  name: string;
  price: number;
  original_price: number | null;
}

interface Discount {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  usage_limit: number | null;
  usage_count: number;
  min_order_amount: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  created_at: string;
}

type TabType = "discounts" | "flashsales";

const PromotionsDiscounts = () => {
  const [activeTab, setActiveTab] = useState<TabType>("discounts");
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [discountForm, setDiscountForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    usage_limit: "",
    min_order_amount: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);

    const [discountsRes, productsRes] = await Promise.all([
      supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, price, original_price")
    ]);

    if (discountsRes.data) setDiscounts(discountsRes.data as unknown as Discount[]);
    if (productsRes.data) setProducts(productsRes.data);
    setIsLoading(false);
  };

  const handleDiscountSubmit = async () => {
    if (!discountForm.code || !discountForm.discount_value) {
      toast.error("Please fill in the required fields");
      return;
    }

    const discountData = {
      code: discountForm.code.toUpperCase(),
      discount_type: discountForm.discount_type,
      discount_value: parseFloat(discountForm.discount_value),
      usage_limit: discountForm.usage_limit ? parseInt(discountForm.usage_limit) : null,
      min_order_amount: parseFloat(discountForm.min_order_amount || "0"),
      start_date: new Date(discountForm.start_date).toISOString(),
      end_date: new Date(discountForm.end_date).toISOString(),
      is_active: true,
    };

    if (editingDiscount) {
      const { error } = await supabase
        .from("promo_codes")
        .update(discountData)
        .eq("id", editingDiscount.id);

      if (error) {
        toast.error("Failed to update discount");
        return;
      }
      toast.success("Discount updated successfully");
    } else {
      const { error } = await supabase.from("promo_codes").insert(discountData);

      if (error) {
        if (error.code === "23505") {
          toast.error("Discount code already exists");
        } else {
          toast.error("Failed to create discount");
        }
        return;
      }
      toast.success("Discount created");
    }

    setShowForm(false);
    setEditingDiscount(null);
    fetchData();
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm("Are you sure you want to delete this discount?")) return;

    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete discount");
      return;
    }

    toast.success("Discount deleted");
    fetchData();
  };

  const toggleDiscountActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !currentActive })
      .eq("id", id);

    if (!error) fetchData();
  };

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const productsOnSale = useMemo(() =>
    products.filter(p => p.original_price && p.original_price > p.price),
    [products]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 bg-primary/20 rounded-full blur-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 lg:p-10 container mx-auto fade-in-bottom">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-indigo-600">
            Promotions Center
          </h2>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your marketing campaigns and special offers.
          </p>
        </div>

        {/* Custom Toggle Switch */}
        <div className="bg-muted/30 p-1.5 rounded-2xl flex relative w-fit">
          <motion.div
            layoutId="activeTabBg"
            className="absolute inset-y-1.5 bg-background shadow-sm rounded-xl"
            initial={false}
            animate={{
              x: activeTab === "discounts" ? 0 : "100%",
              width: "50%"
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          <button
            onClick={() => setActiveTab("discounts")}
            className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === "discounts" ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
          >
            <Tag size={16} />
            Discount Codes
          </button>
          <button
            onClick={() => setActiveTab("flashsales")}
            className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === "flashsales" ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
              }`}
          >
            <Zap size={16} />
            Flash Sales
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Discounts Tab */}
        {activeTab === "discounts" && (
          <motion.div
            key="discounts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setEditingDiscount(null);
                  setDiscountForm({
                    code: "",
                    discount_type: "percentage",
                    discount_value: "",
                    usage_limit: "",
                    min_order_amount: "",
                    start_date: new Date().toISOString().split("T")[0],
                    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  });
                  setShowForm(true);
                }}
                className="group relative inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
              >
                <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                Create New Discount
              </button>
            </div>

            {discounts.length === 0 ? (
              <div className="glass-card p-12 text-center border-dashed border-2">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Tag size={40} className="text-muted-foreground opacity-50" />
                </div>
                <h3 className="text-xl font-bold mb-2">No active discounts</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create discount codes to engage customers and boost sales.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="text-primary font-bold hover:underline"
                >
                  Create your first discount
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {discounts.map((discount, i) => {
                  const percentUsed = discount.usage_limit
                    ? Math.min((discount.usage_count / discount.usage_limit) * 100, 100)
                    : 0;

                  return (
                    <motion.div
                      key={discount.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl ${discount.is_active
                        ? "bg-card/50 backdrop-blur-sm border-white/5 hover:border-primary/20"
                        : "bg-muted/10 border-transparent opacity-60 grayscale hover:grayscale-0"
                        }`}
                    >
                      {/* Ticket Cutout Effect */}
                      <div className="absolute top-1/2 -left-2 w-4 h-4 rounded-full bg-background border-r border-border" />
                      <div className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-background border-l border-border" />

                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <button
                            onClick={() => copyToClipboard(discount.code, discount.id)}
                            className="bg-background/80 hover:bg-background border border-border/50 rounded-lg px-3 py-1.5 flex items-center gap-2 group/code transition-colors"
                          >
                            <span className="font-mono font-bold text-lg tracking-wider">{discount.code}</span>
                            {copiedId === discount.id ? (
                              <Check size={14} className="text-lime" />
                            ) : (
                              <Copy size={14} className="text-muted-foreground group-hover/code:text-primary" />
                            )}
                          </button>

                          <button
                            onClick={() => toggleDiscountActive(discount.id, discount.is_active)}
                            className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider transition-colors ${discount.is_active
                              ? "bg-lime/10 text-lime border border-lime/20"
                              : "bg-muted text-muted-foreground"
                              }`}
                          >
                            {discount.is_active ? "Active" : "Inactive"}
                          </button>
                        </div>

                        <div className="flex items-baseline gap-1 mb-6">
                          <h3 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                            {discount.discount_type === "percentage"
                              ? `${discount.discount_value}%`
                              : `₹${discount.discount_value}`}
                          </h3>
                          <span className="text-sm font-bold text-muted-foreground uppercase">OFF</span>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Wallet size={12} /> Min Spend
                            </p>
                            <p className="font-bold">₹{discount.min_order_amount}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <Calendar size={12} /> Valid Until
                            </p>
                            <p className="font-bold text-sm">
                              {new Date(discount.end_date).toLocaleDateString(undefined, {
                                month: 'short', day: 'numeric', year: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Usage Bar */}
                        <div className="space-y-2 mb-6">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-muted-foreground flex items-center gap-1">
                              <BarChart3 size={12} /> Usage
                            </span>
                            <span className="font-bold">
                              {discount.usage_count} / {discount.usage_limit || "∞"}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-dashed border-border/50">
                          <button
                            onClick={() => {
                              setEditingDiscount(discount);
                              setDiscountForm({
                                code: discount.code,
                                discount_type: discount.discount_type,
                                discount_value: discount.discount_value.toString(),
                                usage_limit: discount.usage_limit?.toString() || "",
                                min_order_amount: discount.min_order_amount.toString(),
                                start_date: discount.start_date.split("T")[0],
                                end_date: discount.end_date.split("T")[0],
                              });
                              setShowForm(true);
                            }}
                            className="flex-1 py-2 text-sm font-bold bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-colors flex items-center justify-center gap-2"
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDiscount(discount.id)}
                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Sales Tab */}
        {activeTab === "flashsales" && (
          <motion.div
            key="flashsales"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-500">Flash Sale Management</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    To create a sale, go to the Products tab and set an "Original Price" higher than the current price. It will automatically appear here.
                  </p>
                </div>
              </div>
              <button
                // Navigate to products tab - implementing as placeholder for now since we don't have direct access to switch parent tab
                className="px-6 py-2 bg-amber-500 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-colors"
              >
                Go to Products
              </button>
            </div>

            {productsOnSale.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <Zap size={64} className="mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-bold">No Active Flash Sales</h3>
                <p>Set a discount price on products to see them here.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {productsOnSale.map((product, i) => {
                  const discountPercent = product.original_price
                    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                    : 0;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card overflow-hidden group hover:border-primary/30 transition-all"
                    >
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                          <span className="bg-destructive text-white px-2 py-1 rounded-md text-xs font-black shadow-lg shadow-destructive/20">
                            -{discountPercent}%
                          </span>
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Zap size={14} className="text-amber-500 fill-amber-500" />
                          </div>
                        </div>

                        <h4 className="font-bold text-lg mb-2 line-clamp-1">{product.name}</h4>

                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-lime">₹{product.price}</span>
                          <span className="text-sm text-muted-foreground line-through decoration-2">
                            ₹{product.original_price}
                          </span>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-gradient-to-r from-primary via-purple-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Modal Form */}
      {/* Modern Modal Form */}
      {showForm && createPortal(
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-md z-[9999]"
            onClick={() => setShowForm(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            className="fixed top-1/2 left-1/2 w-full max-w-lg z-[10000]"
          >
            <div className="bg-card border border-border shadow-2xl rounded-3xl overflow-hidden">
              <div className="p-6 border-b border-border bg-muted/20">
                <h3 className="text-2xl font-black tracking-tight">
                  {editingDiscount ? "Edit Campaign" : "New Campaign"}
                </h3>
                <p className="text-muted-foreground text-sm">Fill in the details for your discount code.</p>
              </div>

              <div className="p-8 space-y-6">
                {/* Code Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Discount Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={discountForm.code}
                      onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                      className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-wide focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                      placeholder="SUMMER2025"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Tag size={18} />
                    </div>
                  </div>
                </div>

                {/* Type & Value Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                    <div className="relative">
                      <select
                        value={discountForm.discount_type}
                        onChange={(e) => setDiscountForm({ ...discountForm, discount_type: e.target.value })}
                        className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 appearance-none focus:ring-2 focus:ring-primary outline-none font-medium"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                        <ArrowRight size={14} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Value</label>
                    <input
                      type="number"
                      value={discountForm.discount_value}
                      onChange={(e) => setDiscountForm({ ...discountForm, discount_value: e.target.value })}
                      className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-primary outline-none"
                      placeholder="20"
                    />
                  </div>
                </div>

                {/* Limits Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Min Order (₹)</label>
                    <input
                      type="number"
                      value={discountForm.min_order_amount}
                      onChange={(e) => setDiscountForm({ ...discountForm, min_order_amount: e.target.value })}
                      className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Usage Limit</label>
                    <input
                      type="number"
                      value={discountForm.usage_limit}
                      onChange={(e) => setDiscountForm({ ...discountForm, usage_limit: e.target.value })}
                      className="w-full bg-muted/50 border border-input rounded-xl px-4 py-3 font-medium focus:ring-2 focus:ring-primary outline-none"
                      placeholder="∞"
                    />
                  </div>
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start Date</label>
                    <input
                      type="date"
                      value={discountForm.start_date}
                      onChange={(e) => setDiscountForm({ ...discountForm, start_date: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">End Date</label>
                    <input
                      type="date"
                      value={discountForm.end_date}
                      onChange={(e) => setDiscountForm({ ...discountForm, end_date: e.target.value })}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/20 border-t border-border flex gap-4">
                <button
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-6 py-3 font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDiscountSubmit}
                  className="flex-[2] px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
                >
                  {editingDiscount ? "Update Campaign" : "Launch Campaign"}
                </button>
              </div>
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
};

export default PromotionsDiscounts;
