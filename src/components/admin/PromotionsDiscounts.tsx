import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Zap, Tag } from "lucide-react";

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

    // Fetch using 'promo_codes' table
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
      toast.error("Fill required fields");
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
      toast.success("Discount updated");
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
    if (!confirm("Delete this discount?")) return;

    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
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

  const productsOnSale = useMemo(() =>
    products.filter(p => p.original_price && p.original_price > p.price),
    [products]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "discounts", label: "Discount Codes", icon: Tag },
          { id: "flashsales", label: "Products on Sale", icon: Zap },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "glass-card hover:bg-muted/50"
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Discounts Tab */}
      {activeTab === "discounts" && (
        <div className="space-y-4">
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
                end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
              });
              setShowForm(true);
            }}
            className="neon-btn bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 text-sm w-fit"
          >
            <Plus size={16} />
            Create Discount
          </button>

          {discounts.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <Tag size={48} className="mx-auto mb-4 opacity-50" />
              <p>No discount codes yet</p>
              <p className="text-sm">Create your first discount code above</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {discounts.map((discount) => (
                <div key={discount.id} className={`glass-card p-4 ${!discount.is_active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-lg">{discount.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {discount.discount_type === "percentage"
                          ? `${discount.discount_value}% OFF`
                          : `₹${discount.discount_value} OFF`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleDiscountActive(discount.id, discount.is_active)}
                      className={`px-2 py-1 text-xs rounded font-bold ${discount.is_active
                          ? "bg-lime/20 text-lime"
                          : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {discount.is_active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                    <p>Min Order: ₹{discount.min_order_amount}</p>
                    <p>
                      Uses: {discount.usage_count}/{discount.usage_limit || "∞"}
                    </p>
                    <p>
                      Valid: {new Date(discount.start_date).toLocaleDateString("en-IN")} -{" "}
                      {new Date(discount.end_date).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="flex gap-2">
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
                      className="flex-1 glass-card py-1 text-xs hover:bg-muted/50 flex items-center justify-center gap-1"
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDiscount(discount.id)}
                      className="glass-card p-1 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Products on Sale Tab */}
      {activeTab === "flashsales" && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Products with original_price set are shown here. Edit products in the Products tab to set sale prices.
          </p>

          {productsOnSale.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <Zap size={48} className="mx-auto mb-4 opacity-50" />
              <p>No products on sale</p>
              <p className="text-sm">Set original_price on products to create sales</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {productsOnSale.map((product) => {
                const discountPercent = product.original_price
                  ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
                  : 0;

                return (
                  <div key={product.id} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-bold">{product.name}</p>
                        <p className="text-xs text-muted-foreground line-through">
                          ₹{product.original_price}
                        </p>
                      </div>
                      <span className="bg-destructive/20 text-destructive px-2 py-1 rounded text-xs font-bold">
                        -{discountPercent}%
                      </span>
                    </div>
                    <p className="text-lime font-bold text-lg">₹{product.price}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Discount Form Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-6 w-full max-w-sm z-50 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold mb-4">
              {editingDiscount ? "Edit Discount" : "Create Discount"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Code *</label>
                <input
                  type="text"
                  value={discountForm.code}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })
                  }
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="E.g., SAVE10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={discountForm.discount_type}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, discount_type: e.target.value })
                    }
                    className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">Value *</label>
                  <input
                    type="number"
                    value={discountForm.discount_value}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, discount_value: e.target.value })
                    }
                    className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Min Order Amount</label>
                <input
                  type="number"
                  value={discountForm.min_order_amount}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, min_order_amount: e.target.value })
                  }
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Uses (leave empty for unlimited)</label>
                <input
                  type="number"
                  value={discountForm.usage_limit}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, usage_limit: e.target.value })
                  }
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Valid From</label>
                  <input
                    type="date"
                    value={discountForm.start_date}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, start_date: e.target.value })
                    }
                    className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Valid Until</label>
                  <input
                    type="date"
                    value={discountForm.end_date}
                    onChange={(e) =>
                      setDiscountForm({ ...discountForm, end_date: e.target.value })
                    }
                    className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDiscount(null);
                }}
                className="flex-1 glass-card py-2 hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleDiscountSubmit}
                className="flex-1 neon-btn bg-primary text-primary-foreground py-2 rounded-xl"
              >
                {editingDiscount ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PromotionsDiscounts;
