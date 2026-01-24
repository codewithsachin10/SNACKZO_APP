/**
 * Express Delivery Badge Component
 * Shows 10-minute delivery guarantee badge on products and checkout
 */

import { motion } from "framer-motion";
import { Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpressDeliveryBadgeProps {
  variant?: "default" | "compact" | "large";
  className?: string;
  showIcon?: boolean;
  animated?: boolean;
}

export function ExpressDeliveryBadge({
  variant = "default",
  className,
  showIcon = true,
  animated = true
}: ExpressDeliveryBadgeProps) {
  const variants = {
    default: "px-3 py-1.5 text-xs",
    compact: "px-2 py-1 text-[10px]",
    large: "px-4 py-2 text-sm"
  };

  const content = (
    <div className={cn(
      "inline-flex items-center gap-1.5 rounded-full font-black uppercase tracking-wider",
      "bg-gradient-to-r from-lime via-green-400 to-lime text-black",
      "border-2 border-lime/50 shadow-lg shadow-lime/25",
      variants[variant],
      className
    )}>
      {showIcon && (
        <motion.div
          animate={animated ? { rotate: [0, 10, -10, 0] } : {}}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <Zap size={variant === "compact" ? 10 : variant === "large" ? 16 : 12} className="fill-current" />
        </motion.div>
      )}
      <span>10 MIN DELIVERY</span>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * Express Delivery Info Card
 */
export function ExpressDeliveryInfo({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border-2 border-lime/30 bg-gradient-to-br from-lime/10 to-green-500/10 p-4",
      className
    )}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-lime/20">
          <Zap size={20} className="text-lime" />
        </div>
        <div className="flex-1">
          <h3 className="font-black text-sm uppercase text-lime mb-1">
            Express Delivery Available
          </h3>
          <p className="text-xs text-muted-foreground mb-2">
            Get your order delivered in 10 minutes or less. Available for orders above ₹100.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Clock size={12} className="text-lime" />
              <span className="font-bold">10 min</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap size={12} className="text-lime" />
              <span className="font-bold">Priority</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
