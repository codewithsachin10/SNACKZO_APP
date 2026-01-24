import { useState, useCallback, useRef, ReactNode } from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
  threshold?: number;
  resistance?: number;
  refreshingText?: string;
  pullingText?: string;
  releaseText?: string;
}

export function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  resistance = 2.5,
  refreshingText = "Refreshing...",
  pullingText = "Pull to refresh",
  releaseText = "Release to refresh"
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const controls = useAnimation();
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  const canPull = useCallback(() => {
    if (disabled || isRefreshing) return false;
    // Only allow pull if at top of scroll
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    return scrollTop <= 0;
  }, [disabled, isRefreshing]);

  const handlePanStart = (_: any, info: PanInfo) => {
    if (!canPull()) return;
    startY.current = info.point.y;
    setIsPulling(true);
  };

  const handlePan = (_: any, info: PanInfo) => {
    if (!canPull() || !isPulling) return;
    
    const delta = info.point.y - startY.current;
    if (delta < 0) {
      setPullDistance(0);
      return;
    }
    
    // Apply resistance
    const adjustedDistance = delta / resistance;
    setPullDistance(Math.min(adjustedDistance, threshold * 1.5));
    
    // Haptic feedback at threshold
    if (adjustedDistance >= threshold && pullDistance < threshold) {
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  };

  const handlePanEnd = async () => {
    if (!isPulling) return;
    setIsPulling(false);

    if (pullDistance >= threshold) {
      // Trigger refresh
      setIsRefreshing(true);
      setPullDistance(60); // Hold at refresh position
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([20, 50, 20]);
      }
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        await controls.start({ y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
      }
    } else {
      // Snap back
      setPullDistance(0);
      await controls.start({ y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } });
    }
  };

  const progress = Math.min(pullDistance / threshold, 1);
  const shouldRelease = pullDistance >= threshold;

  return (
    <div className="relative overflow-hidden" ref={containerRef}>
      {/* Refresh indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center z-10 pointer-events-none"
        style={{ height: pullDistance }}
        animate={{ opacity: progress }}
      >
        <motion.div
          className="flex flex-col items-center gap-2 p-4"
          animate={{ 
            scale: 0.8 + progress * 0.2,
            y: pullDistance > 0 ? 0 : -20
          }}
        >
          <motion.div
            animate={{ 
              rotate: isRefreshing ? 360 : progress * 180,
            }}
            transition={isRefreshing ? { 
              repeat: Infinity, 
              duration: 1, 
              ease: "linear" 
            } : {}}
            className={`p-2 rounded-full ${shouldRelease || isRefreshing ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
          >
            <RefreshCw size={20} />
          </motion.div>
          <span className="text-xs font-medium text-muted-foreground">
            {isRefreshing ? refreshingText : shouldRelease ? releaseText : pullingText}
          </span>
        </motion.div>
        
        {/* Progress arc */}
        {!isRefreshing && (
          <svg className="absolute top-4 w-10 h-10" viewBox="0 0 40 40">
            <circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-muted"
            />
            <motion.circle
              cx="20"
              cy="20"
              r="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-primary"
              strokeLinecap="round"
              strokeDasharray={100}
              animate={{ strokeDashoffset: 100 - (progress * 100) }}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          </svg>
        )}
      </motion.div>

      {/* Content */}
      <motion.div
        animate={controls}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        style={{ y: pullDistance, touchAction: isPulling ? "none" : "auto" }}
        className="min-h-full"
      >
        {children}
      </motion.div>
    </div>
  );
}

// ============================================
// SIMPLE REFRESH BUTTON (Alternative)
// ============================================

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  className?: string;
}

export function RefreshButton({ onRefresh, className = "" }: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <motion.button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50 ${className}`}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ rotate: isRefreshing ? 360 : 0 }}
        transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
      >
        <RefreshCw size={18} />
      </motion.div>
    </motion.button>
  );
}
