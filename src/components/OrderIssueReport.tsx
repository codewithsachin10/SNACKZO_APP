import { useState } from "react";
import { AlertTriangle, Camera, X, Send, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type IssueCategory = 
  | "wrong_item"
  | "missing_item"
  | "late_delivery"
  | "damaged_item"
  | "wrong_quantity"
  | "quality_issue"
  | "rude_behavior"
  | "other";

interface OrderIssueReportProps {
  orderId: string;
  onIssueSubmitted?: () => void;
  onClose?: () => void;
}

const issueCategories: { value: IssueCategory; label: string; icon: string }[] = [
  { value: "wrong_item", label: "Wrong Item", icon: "📦" },
  { value: "missing_item", label: "Missing Item", icon: "❓" },
  { value: "late_delivery", label: "Late Delivery", icon: "⏰" },
  { value: "damaged_item", label: "Damaged Item", icon: "💔" },
  { value: "wrong_quantity", label: "Wrong Quantity", icon: "🔢" },
  { value: "quality_issue", label: "Quality Issue", icon: "👎" },
  { value: "rude_behavior", label: "Rude Behavior", icon: "😠" },
  { value: "other", label: "Other Issue", icon: "📝" },
];

export const OrderIssueReport = ({
  orderId,
  onIssueSubmitted,
  onClose
}: OrderIssueReportProps) => {
  const { user } = useAuth();
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || images.length >= 3) return;

    for (const file of Array.from(files)) {
      if (images.length >= 3) break;

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}-${Date.now()}.${fileExt}`;
      const filePath = `issue-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-issues')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        // For now, use data URL as fallback
        const reader = new FileReader();
        reader.onload = (event) => {
          setImages(prev => [...prev, event.target?.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('order-issues')
          .getPublicUrl(filePath);
        setImages(prev => [...prev, publicUrl]);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || !category) {
      toast.error("Please select an issue category");
      return;
    }

    if (!description.trim()) {
      toast.error("Please describe the issue");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await (supabase.from as any)("order_issues").insert({
        order_id: orderId,
        user_id: user.id,
        category,
        description: description.trim(),
        image_urls: images.length > 0 ? images : null,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("Issue reported successfully");
      onIssueSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting issue:", error);
      toast.error(error.message || "Failed to submit issue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="neu-card bg-card p-6 text-center">
        <div className="bg-lime/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={32} className="text-lime" />
        </div>
        <h3 className="text-xl font-bold mb-2">Issue Reported</h3>
        <p className="text-muted-foreground mb-4">
          We've received your report and will investigate shortly. You'll be notified once resolved.
        </p>
        <p className="text-sm text-muted-foreground">
          Reference: #{orderId.slice(0, 8)}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="mt-4 neu-btn bg-secondary text-secondary-foreground px-6 py-2"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="neu-card bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-destructive/20 p-2 rounded-lg">
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <h3 className="font-bold">Report an Issue</h3>
            <p className="text-sm text-muted-foreground">
              Order #{orderId.slice(0, 8)}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Category Selection */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          What went wrong?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {issueCategories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`p-3 rounded-lg border-2 text-left transition-all ${
                category === cat.value
                  ? "border-secondary bg-secondary/10"
                  : "border-muted hover:border-muted-foreground"
              }`}
            >
              <span className="text-xl mr-2">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Describe the issue
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please provide details about what happened..."
          rows={3}
          className="w-full p-3 bg-muted rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {/* Image Upload */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Add photos (optional, max 3)
        </label>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, index) => (
            <div key={index} className="relative w-20 h-20">
              <img
                src={img}
                alt={`Issue ${index + 1}`}
                className="w-full h-full object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-6 h-6 rounded-full flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <label className="w-20 h-20 border-2 border-dashed border-muted-foreground rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-secondary transition-colors">
              <Camera size={24} className="text-muted-foreground" />
              <span className="text-xs text-muted-foreground mt-1">Add</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                multiple
              />
            </label>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!category || !description.trim() || isSubmitting}
        className="w-full neu-btn bg-destructive text-destructive-foreground py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={18} />
            Submit Report
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        We typically respond within 24 hours. For urgent issues, please call support.
      </p>
    </div>
  );
};

// Button to trigger issue report
export const ReportIssueButton = ({
  orderId,
  variant = "default"
}: {
  orderId: string;
  variant?: "default" | "small";
}) => {
  const [showReport, setShowReport] = useState(false);

  if (showReport) {
    return (
      <OrderIssueReport
        orderId={orderId}
        onClose={() => setShowReport(false)}
        onIssueSubmitted={() => setTimeout(() => setShowReport(false), 2000)}
      />
    );
  }

  if (variant === "small") {
    return (
      <button
        onClick={() => setShowReport(true)}
        className="text-sm text-destructive hover:underline flex items-center gap-1"
      >
        <AlertTriangle size={14} />
        Report Issue
      </button>
    );
  }

  return (
    <button
      onClick={() => setShowReport(true)}
      className="neu-btn bg-destructive/10 text-destructive py-2 px-4 flex items-center gap-2 hover:bg-destructive/20 transition-colors"
    >
      <AlertTriangle size={18} />
      Report Issue
    </button>
  );
};
