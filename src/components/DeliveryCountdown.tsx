/**
 * Real-Time Delivery Countdown Timer Component
 * Shows live countdown to estimated delivery time
 */

import { useState, useEffect } from "react";
import { Clock, Zap, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ETAResult, getCountdownSeconds, formatETA } from "@/utils/deliveryETA";
import { cn } from "@/lib/utils";

interface DeliveryCountdownProps {
  eta: ETAResult;
  onUpdate?: (newETA: ETAResult) => void;
  showDetails?: boolean;
  isExpress?: boolean;
  className?: string;
}

export function DeliveryCountdown({
  eta,
  onUpdate,
  showDetails = false,
  isExpress = false,
  className
}: DeliveryCountdownProps) {
  const [countdown, setCountdown] = useState(getCountdownSeconds(eta.estimatedTime));
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      const seconds = getCountdownSeconds(eta.estimatedTime);
      setCountdown(seconds);
      setIsOverdue(seconds === 0 && new Date() > eta.estimatedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [eta.estimatedTime]);

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return "Arriving now";
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    return `${secs}s`;
  };

  const getStatusColor = () => {
    if (isOverdue) return "text-red-500";
    if (countdown <= 60) return "text-lime";
    if (countdown <= 180) return "text-amber-500";
    return "text-blue-500";
  };

  const getStatusBg = () => {
    if (isOverdue) return "bg-red-500/20 border-red-500/30";
    if (countdown <= 60) return "bg-lime/20 border-lime/30";
    if (countdown <= 180) return "bg-amber-500/20 border-amber-500/30";
    return "bg-blue-500/20 border-blue-500/30";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("space-y-3", className)}
    >
      {/* Main Countdown Display */}
      <div className={cn(
        "rounded-2xl border-2 p-4 transition-all duration-300",
        getStatusBg(),
        isOverdue && "animate-pulse"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              isOverdue ? "bg-red-500/20" : isExpress ? "bg-lime/20" : "bg-blue-500/20"
            )}>
              {isOverdue ? (
                <AlertCircle size={24} className="text-red-500" />
              ) : isExpress ? (
                <Zap size={24} className="text-lime" />
              ) : (
                <Clock size={24} className="text-blue-500" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                {isExpress ? "Express Delivery" : "Estimated Arrival"}
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <motion.span
                  key={countdown}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={cn("text-3xl font-black", getStatusColor())}
                >
                  {formatCountdown(countdown)}
                </motion.span>
                {!isOverdue && (
                  <span className="text-sm text-muted-foreground">
                    ({formatETA(eta)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Express Badge */}
          {isExpress && !isOverdue && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-3 py-1.5 rounded-full bg-gradient-to-r from-lime to-green-500 text-black text-xs font-black uppercase"
            >
              10 MIN GUARANTEE
            </motion.div>
          )}

          {/* Overdue Badge */}
          {isOverdue && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-black uppercase animate-pulse"
            >
              DELAYED
            </motion.div>
          )}
        </div>
      </div>

      {/* Details Panel */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Confidence</span>
              <span className={cn(
                "font-bold capitalize",
                eta.confidence === 'high' ? "text-lime" :
                eta.confidence === 'medium' ? "text-amber-500" : "text-muted-foreground"
              )}>
                {eta.confidence}
              </span>
            </div>
            
            {eta.factors && (
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                <div>
                  <span className="text-muted-foreground text-xs">Base Time</span>
                  <p className="font-bold">{eta.factors.baseTime} min</p>
                </div>
                {eta.factors.queueDelay > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Queue Delay</span>
                    <p className="font-bold text-amber-500">+{eta.factors.queueDelay} min</p>
                  </div>
                )}
                {eta.factors.trafficDelay > 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Traffic</span>
                    <p className="font-bold text-orange-500">+{eta.factors.trafficDelay} min</p>
                  </div>
                )}
                {eta.factors.expressBonus < 0 && (
                  <div>
                    <span className="text-muted-foreground text-xs">Express Bonus</span>
                    <p className="font-bold text-lime">{eta.factors.expressBonus} min</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground">
                Estimated arrival: {eta.estimatedTime.toLocaleTimeString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Compact countdown badge for order cards
 */
export function DeliveryCountdownBadge({ 
  eta, 
  isExpress = false 
}: { 
  eta: ETAResult; 
  isExpress?: boolean;
}) {
  const [countdown, setCountdown] = useState(getCountdownSeconds(eta.estimatedTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(getCountdownSeconds(eta.estimatedTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [eta.estimatedTime]);

  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return "Arriving";
    const minutes = Math.floor(seconds / 60);
    return minutes > 0 ? `${minutes}m` : `${seconds}s`;
  };

  return (
    <motion.span
      key={countdown}
      initial={{ scale: 1.1 }}
      animate={{ scale: 1 }}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
        isExpress 
          ? "bg-lime/20 text-lime border border-lime/30" 
          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
      )}
    >
      {isExpress ? <Zap size={12} /> : <Clock size={12} />}
      {formatCountdown(countdown)}
    </motion.span>
  );
}
