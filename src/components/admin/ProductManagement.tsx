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
  Upload,
  Folder,
  Loader2,
  Sparkles,
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

  const PRESET_IMAGES = [
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80", // Burger
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80", // Pizza
    "https://images.unsplash.com/photo-1574126154517-d1bd7269f15e?auto=format&fit=crop&w=800&q=80", // Pepperoni
    "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80", // Burger 2
    "https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80", // Burger 3
    "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=800&q=80", // Club Sandwich
    "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80", // Cocktail
    "https://images.unsplash.com/photo-1544148103-0773bf10d330?auto=format&fit=crop&w=800&q=80", // Iced Tea
    "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=800&q=80", // Choco Donut
    "https://images.unsplash.com/photo-1630384060440-61cb3c40460c?auto=format&fit=crop&w=800&q=80", // Biryani
    "https://images.unsplash.com/photo-1554866572-c6326c710dbf?auto=format&fit=crop&w=800&q=80", // Fries
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80", // Dumplings/Momos
    "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80", // Fried Chicken
    "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=800&q=80", // Coffee
    "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80"  // Cake
  ];


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

  // Image Handling
  const [imageTab, setImageTab] = useState<'url' | 'upload' | 'library' | 'presets'>('url');
  const [isUploading, setIsUploading] = useState(false);
  const [libraryImages, setLibraryImages] = useState<{ name: string, url: string }[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    setIsUploading(true);
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file);

    if (uploadError) {
      console.error(uploadError);
      toast.error('Upload failed: ' + uploadError.message);
      setIsUploading(false);
      return;
    }

    const { data } = supabase.storage.from('products').getPublicUrl(fileName);
    setFormData({ ...formData, image_url: data.publicUrl });
    setIsUploading(false);
    toast.success('Image uploaded!');
  };

  const fetchLibrary = async () => {
    const { data, error } = await supabase.storage.from('products').list();
    if (data) {
      const images = data.map(file => {
        const { data: urlData } = supabase.storage.from('products').getPublicUrl(file.name);
        return { name: file.name, url: urlData.publicUrl };
      });
      setLibraryImages(images);
    }
  };

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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Product Image</label>
                  <div className="flex bg-muted/50 rounded-lg p-0.5 gap-0.5">
                    <button
                      onClick={() => setImageTab('url')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${imageTab === 'url' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                    >URL</button>
                    <button
                      onClick={() => setImageTab('upload')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${imageTab === 'upload' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                    ><Upload size={12} /> Upload</button>
                    <button
                      onClick={() => { setImageTab('library'); fetchLibrary(); }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${imageTab === 'library' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                    ><Folder size={12} /> Library</button>
                    <button
                      onClick={() => setImageTab('presets')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${imageTab === 'presets' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
                    ><Sparkles size={12} className="text-purple-500" /> Stock</button>
                  </div>
                </div>

                {imageTab === 'url' && (
                  <input
                    type="text"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    className="w-full glass-card p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
                    placeholder="https://example.com/image.jpg"
                  />
                )}

                {imageTab === 'upload' && (
                  <div className="border border-dashed border-input rounded-xl p-6 text-center hover:bg-muted/30 transition-colors relative group cursor-pointer bg-muted/5">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-2 transition-transform group-hover:scale-105">
                      {isUploading ? (
                        <>
                          <Loader2 className="animate-spin text-primary" size={24} />
                          <span className="text-xs font-medium text-muted-foreground">Uploading image...</span>
                        </>
                      ) : (
                        <>
                          <div className="p-3 bg-background rounded-full shadow-sm">
                            <Upload className="text-primary" size={20} />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium">Click to upload</p>
                            <p className="text-[10px] text-muted-foreground">SVG, PNG, JPG or GIF</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {imageTab === 'library' && (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 p-1 bg-muted/10 rounded-xl border border-border/50">
                    {libraryImages.length === 0 ? (
                      <div className="col-span-3 flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <ImageIcon size={24} className="mb-2 opacity-20" />
                        <p className="text-xs">No images found in library.</p>
                      </div>
                    ) : (
                      libraryImages.map((img) => (
                        <button
                          key={img.name}
                          onClick={() => setFormData({ ...formData, image_url: img.url })}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${formData.image_url === img.url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50 bg-background'}`}
                        >
                          <img src={img.url} className="w-full h-full object-cover" loading="lazy" alt="Library asset" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        </button>
                      ))
                    )}
                  </div>
                )}

                {imageTab === 'presets' && (
                  <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 p-1 bg-muted/10 rounded-xl border border-border/50 scrollbar-thin">
                    {PRESET_IMAGES.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setFormData({ ...formData, image_url: url })}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all group ${formData.image_url === url ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-primary/50 bg-background'}`}
                      >
                        <img src={url} className="w-full h-full object-cover" loading="lazy" alt={`Stock ${idx}`} />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                        {formData.image_url === url && (
                          <div className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-[1px]">
                            <div className="bg-primary text-primary-foreground p-1 rounded-full shadow-lg">
                              <Sparkles size={12} fill="currentColor" />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Preview Selected */}
                {formData.image_url && (
                  <div className="relative mt-2 rounded-xl overflow-hidden border border-border h-32 group bg-dots">
                    <img src={formData.image_url} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-start justify-end p-2 opacity-0 hover:opacity-100">
                      <button
                        onClick={() => setFormData({ ...formData, image_url: "" })}
                        className="bg-destructive text-destructive-foreground p-1.5 rounded-lg shadow-lg hover:bg-destructive/90 transition-colors"
                        title="Remove Image"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] text-white font-medium">
                      Preview
                    </div>
                  </div>
                )}
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
