import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Star, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  profiles?: { full_name: string } | null;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

const ProductReviews = ({ productId, productName }: ProductReviewsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("reviews" as any)
      .select("*, profiles(full_name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false }) as any;

    if (!error && data) {
      setReviews(data);
      if (data.length > 0) {
        const avg = data.reduce((sum: number, r: any) => sum + r.rating, 0) / data.length;
        setAverageRating(Math.round(avg * 10) / 10);
      }
      if (user) {
        setUserHasReviewed(data.some((r: any) => r.user_id === user.id));
      }
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please login to submit a review");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from("reviews" as any)
      .insert({
        user_id: user.id,
        product_id: productId,
        rating,
        comment: comment.trim() || null,
        is_verified_purchase: false
      });

    if (error) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } else {
      toast.success("Review submitted!");
      setShowForm(false);
      setComment("");
      setRating(5);
      fetchReviews();
    }
    setIsSubmitting(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const StarRating = ({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        >
          <Star
            size={readonly ? 16 : 24}
            className={star <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">Reviews</h3>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <StarRating value={Math.round(averageRating)} readonly />
              <span>{averageRating} ({reviews.length} reviews)</span>
            </div>
          )}
        </div>
        {!userHasReviewed && !showForm && (
          <button
            onClick={() => {
              if (!user) {
                navigate("/auth?mode=signin");
                return;
              }
              setShowForm(true);
            }}
            className="neu-btn bg-primary text-primary-foreground px-4 py-2 text-sm"
          >
            Write Review
          </button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-4">
          <h4 className="font-bold">Your Review for {productName}</h4>

          <div>
            <label className="block text-sm font-medium mb-2">Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full glass-card p-3 min-h-[100px] resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 glass-card py-2 hover:bg-muted/50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 neon-btn bg-primary text-primary-foreground py-2 rounded-xl disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-4 animate-pulse">
              <div className="h-4 bg-muted w-1/4 mb-2" />
              <div className="h-3 bg-muted w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-card p-6 text-center text-muted-foreground">
          <Star size={32} className="mx-auto mb-2 opacity-50" />
          <p>No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="glass-card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <User size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {(review.profiles as any)?.full_name || "Anonymous"}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(review.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StarRating value={review.rating} readonly />
                  {review.is_verified_purchase && (
                    <span className="text-xs bg-lime/20 text-lime px-2 py-0.5 rounded-full ml-2">
                      Verified
                    </span>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
