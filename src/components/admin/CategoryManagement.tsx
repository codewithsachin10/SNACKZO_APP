import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, GripVertical, Save } from "lucide-react";

interface Category {
  id: string;
  name: string;
  emoji: string | null;
  display_order: number;
}

const CategoryManagement = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: "", emoji: "" });
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("display_order");

    if (error) {
      toast.error("Failed to load categories");
      return;
    }

    setCategories(data || []);
    setIsLoading(false);
  };

  const handleOpenForm = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name, emoji: category.emoji || "" });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", emoji: "" });
    }
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update({
          name: formData.name.trim(),
          emoji: formData.emoji || null,
        })
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Failed to update category");
        return;
      }
      toast.success("Category updated");
    } else {
      const newOrder = Math.max(...categories.map((c) => c.display_order), 0) + 1;

      const { error } = await supabase.from("categories").insert({
        name: formData.name.trim(),
        emoji: formData.emoji || null,
        display_order: newOrder,
      });

      if (error) {
        toast.error("Failed to create category");
        return;
      }
      toast.success("Category created");
    }

    setShowForm(false);
    fetchCategories();
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Delete this category? Products will become uncategorized.")) return;

    const { error } = await supabase.from("categories").delete().eq("id", categoryId);

    if (error) {
      toast.error("Failed to delete category");
      return;
    }
    toast.success("Category deleted");
    fetchCategories();
  };

  const moveCategory = async (category: Category, direction: "up" | "down") => {
    const currentIndex = categories.findIndex((c) => c.id === category.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const targetCategory = categories[targetIndex];

    try {
      await Promise.all([
        supabase
          .from("categories")
          .update({ display_order: targetCategory.display_order })
          .eq("id", category.id),
        supabase
          .from("categories")
          .update({ display_order: category.display_order })
          .eq("id", targetCategory.id),
      ]);

      fetchCategories();
    } catch (error) {
      toast.error("Failed to reorder categories");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <h3 className="font-bold flex-1">Categories ({categories.length})</h3>
        <button
          onClick={() => handleOpenForm()}
          className="neon-btn bg-primary text-primary-foreground px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Categories List */}
      <div className="space-y-2">
        {categories.map((category, index) => (
          <div key={category.id} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <GripVertical size={18} className="text-muted-foreground" />
              <span className="text-lg">{category.emoji || "📦"}</span>
              <span className="font-medium">{category.name}</span>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Order: {category.display_order}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => moveCategory(category, "up")}
                disabled={index === 0}
                className="p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50"
              >
                ↑
              </button>
              <button
                onClick={() => moveCategory(category, "down")}
                disabled={index === categories.length - 1}
                className="p-2 rounded-lg hover:bg-muted/50 disabled:opacity-50"
              >
                ↓
              </button>
              <button
                onClick={() => handleOpenForm(category)}
                className="p-2 rounded-lg hover:bg-muted/50"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 glass-card p-6 w-full max-w-sm z-50">
            <h3 className="font-bold mb-4">
              {editingCategory ? "Edit Category" : "Add Category"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Category Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="E.g., Snacks, Beverages"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Emoji</label>
                <input
                  type="text"
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  maxLength={2}
                  className="w-full glass-card p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="E.g., 🍕"
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
                className="flex-1 neon-btn bg-primary text-primary-foreground py-2 rounded-xl flex items-center justify-center gap-1"
              >
                <Save size={16} />
                {editingCategory ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryManagement;
