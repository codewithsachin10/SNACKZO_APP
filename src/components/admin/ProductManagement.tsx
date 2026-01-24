import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  Package,
  ImageIcon,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number;
  image_url: string;
  category_id: string;
  stock: number;
  is_available: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string | null;
}

const ProductManagement = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    original_price: "",
    image_url: "",
    category_id: "",
    stock: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("categories").select("*"),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
    setIsLoading(false);
  };

  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [products, searchQuery]
  );

  const handleOpenForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        price: product.price.toString(),
        original_price: product.original_price?.toString() || "",
        image_url: product.image_url || "",
        category_id: product.category_id || "",
        stock: product.stock.toString(),
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        price: "",
        original_price: "",
        image_url: "",
        category_id: "",
        stock: "",
      });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.category_id || !formData.stock) {
      toast.error("Fill all required fields");
      return;
    }

    const productData = {
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image_url: formData.image_url,
      category_id: formData.category_id,
      stock: parseInt(formData.stock),
      is_available: parseInt(formData.stock) > 0,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Failed to update product");
        return;
      }
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("products").insert(productData);

      if (error) {
        toast.error("Failed to create product");
        return;
      }
      toast.success("Product created");
    }

    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this product?")) return;

    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      toast.error("Failed to delete product");
      return;
    }
    toast.success("Product deleted");
    fetchData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-card pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="neon-btn bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {/* Products Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const category = categories.find((c) => c.id === product.category_id);
          const discount =
            product.original_price && product.price < product.original_price
              ? Math.round(
                ((product.original_price - product.price) / product.original_price) * 100
              )
              : 0;

          return (
            <div key={product.id} className="glass-card overflow-hidden">
              <div className="hover-inner-glow w-full h-40">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon size={32} className="text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-bold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category?.emoji} {category?.name}
                    </p>
                  </div>
                  {discount > 0 && (
                    <span className="bg-destructive/20 text-destructive px-2 py-1 rounded text-xs font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {product.description}
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <DollarSign size={14} className="text-lime" />
                  <span className="font-bold">₹{product.price}</span>
                  {product.original_price && product.original_price > product.price && (
                    <span className="text-xs text-muted-foreground line-through">
                      ₹{product.original_price}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                  <Package size={14} />
                  <span>
                    {product.stock} in stock {!product.is_available && "(Unavailable)"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenForm(product)}
                    className="flex-1 glass-card py-2 hover:bg-muted/50 flex items-center justify-center gap-1 text-sm"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="glass-card p-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Form Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-6 w-full max-w-lg z-50 max-h-96 overflow-y-auto">
            <h3 className="font-bold mb-4">
              {editingProduct ? "Edit Product" : "Add Product"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Product Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={2}
                  placeholder="Enter product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Price (₹) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Original Price (₹)</label>
                  <input
                    type="number"
                    value={formData.original_price}
                    onChange={(e) =>
                      setFormData({ ...formData, original_price: e.target.value })
                    }
                    className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Category *</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Stock *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Image URL</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 glass-card py-2 hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 neon-btn bg-primary text-primary-foreground py-2 rounded-xl"
              >
                {editingProduct ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductManagement;
