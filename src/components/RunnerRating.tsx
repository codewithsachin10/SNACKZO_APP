import { useState } from "react";
import { Star, ThumbsUp, Zap, Package, MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface RunnerRatingProps {
  orderId: string;
  runnerId: string;
  runnerName?: string;
  onRatingSubmitted?: () => void;
  existingRating?: {
    rating: number;
    feedback?: string;
    delivery_speed_rating?: number;
    communication_rating?: number;
    package_condition_rating?: number;
  };
}

export const RunnerRating = ({
  orderId,
  runnerId,
  runnerName = "Runner",
  onRatingSubmitted,
  existingRating
}: RunnerRatingProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState(existingRating?.feedback || "");
  const [speedRating, setSpeedRating] = useState(existingRating?.delivery_speed_rating || 0);
  const [communicationRating, setCommunicationRating] = useState(existingRating?.communication_rating || 0);
  const [packageRating, setPackageRating] = useState(existingRating?.package_condition_rating || 0);
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(!!existingRating);

  const quickFeedback = [
    { emoji: "⚡", text: "Super fast!" },
    { emoji: "😊", text: "Very friendly" },
    { emoji: "📦", text: "Perfect packaging" },
    { emoji: "👍", text: "Great service" },
  ];

  const handleSubmit = async () => {
    if (!user || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await (supabase.from as any)("runner_ratings").upsert({
        order_id: orderId,
        runner_id: runnerId,
        user_id: user.id,
        rating,
        feedback: feedback || null,
        delivery_speed_rating: speedRating || null,
        communication_rating: communicationRating || null,
        package_condition_rating: packageRating || null,
      }, {
        onConflict: 'order_id'
      });

      if (error) throw error;

      toast.success("Thanks for your feedback! 🎉");
      setHasSubmitted(true);
      onRatingSubmitted?.();
    } catch (error: any) {
      console.error("Error submitting rating:", error);
      toast.error(error.message || "Failed to submit rating");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addQuickFeedback = (text: string) => {
    setFeedback((prev) => (prev ? `${prev} ${text}` : text));
  };

  const StarRating = ({
    value,
    onChange,
    size = 24,
    readonly = false
  }: {
    value: number;
    onChange?: (val: number) => void;
    size?: number;
    readonly?: boolean;
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly || hasSubmitted}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className={`transition-transform ${!readonly && !hasSubmitted ? "hover:scale-110" : ""} disabled:cursor-default`}
        >
          <Star
            size={size}
            className={`${
              star <= (hoverRating || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );

  if (hasSubmitted) {
    return (
      <div className="neu-card bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-lime/20 p-2 rounded-full">
            <ThumbsUp size={20} className="text-lime" />
          </div>
          <div>
            <p className="font-bold">Thanks for rating!</p>
            <p className="text-sm text-muted-foreground">
              You rated {runnerName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating value={rating} readonly />
          <span className="text-sm text-muted-foreground">({rating}/5)</span>
        </div>
        {feedback && (
          <p className="mt-2 text-sm text-muted-foreground italic">"{feedback}"</p>
        )}
      </div>
    );
  }

  return (
    <div className="neu-card bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold">Rate Your Delivery</h3>
          <p className="text-sm text-muted-foreground">
            How was {runnerName}'s service?
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-secondary underline"
        >
          {showDetails ? "Simple" : "Detailed"}
        </button>
      </div>

      {/* Main Rating */}
      <div className="flex flex-col items-center py-4">
        <StarRating value={rating} onChange={setRating} size={36} />
        <p className="mt-2 text-sm text-muted-foreground">
          {rating === 0 && "Tap to rate"}
          {rating === 1 && "Poor"}
          {rating === 2 && "Fair"}
          {rating === 3 && "Good"}
          {rating === 4 && "Very Good"}
          {rating === 5 && "Excellent!"}
        </p>
      </div>

      {/* Detailed Ratings */}
      {showDetails && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-500" />
              <span className="text-sm">Delivery Speed</span>
            </div>
            <StarRating value={speedRating} onChange={setSpeedRating} size={18} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-cyan" />
              <span className="text-sm">Communication</span>
            </div>
            <StarRating value={communicationRating} onChange={setCommunicationRating} size={18} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-lime" />
              <span className="text-sm">Package Condition</span>
            </div>
            <StarRating value={packageRating} onChange={setPackageRating} size={18} />
          </div>
        </div>
      )}

      {/* Quick Feedback */}
      <div className="flex flex-wrap gap-2">
        {quickFeedback.map((item) => (
          <button
            key={item.text}
            type="button"
            onClick={() => addQuickFeedback(item.text)}
            className="px-3 py-1 bg-muted text-sm rounded-full hover:bg-muted/80 transition-colors"
          >
            {item.emoji} {item.text}
          </button>
        ))}
      </div>

      {/* Feedback Input */}
      <div className="relative">
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Add a comment (optional)"
          rows={2}
          className="w-full p-3 pr-12 bg-muted rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-secondary"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="w-full neu-btn bg-secondary text-secondary-foreground py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
            Submitting...
          </>
        ) : (
          <>
            <Send size={18} />
            Submit Rating
          </>
        )}
      </button>
    </div>
  );
};

// Display component for runner's average rating
export const RunnerRatingDisplay = ({
  averageRating,
  totalRatings,
  size = "default"
}: {
  averageRating: number;
  totalRatings: number;
  size?: "small" | "default" | "large";
}) => {
  const sizeConfig = {
    small: { star: 14, text: "text-xs" },
    default: { star: 18, text: "text-sm" },
    large: { star: 24, text: "text-base" }
  };

  const config = sizeConfig[size];

  return (
    <div className="flex items-center gap-1">
      <Star
        size={config.star}
        className="fill-amber-400 text-amber-400"
      />
      <span className={`font-bold ${config.text}`}>
        {averageRating.toFixed(1)}
      </span>
      <span className={`text-muted-foreground ${config.text}`}>
        ({totalRatings})
      </span>
    </div>
  );
};
