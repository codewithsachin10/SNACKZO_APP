import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { 
  Sparkles, Gift, Trophy, Star, Loader2, Coins, PartyPopper,
  ChevronRight, Clock, Info, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

interface WheelSegment {
  id: string;
  label: string;
  value: number;
  type: "points" | "discount_percent" | "discount_fixed" | "free_delivery" | "nothing";
  color: string;
  probability: number;
}

interface SpinResult {
  segment: WheelSegment;
  points_earned?: number;
  discount_code?: string;
}

interface SpinWheelProps {
  onRewardEarned?: (result: SpinResult) => void;
}

export function SpinWheel({ onRewardEarned }: SpinWheelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpinning, setIsSpinning] = useState(false);
  const [canSpin, setCanSpin] = useState(false);
  const [lastSpinTime, setLastSpinTime] = useState<Date | null>(null);
  const [timeUntilNextSpin, setTimeUntilNextSpin] = useState<number>(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [featureEnabled, setFeatureEnabled] = useState(false);

  const controls = useAnimation();

  useEffect(() => {
    checkFeatureEnabled();
  }, []);

  useEffect(() => {
    if (user && featureEnabled) {
      fetchWheelData();
      checkSpinEligibility();
    }
  }, [user, featureEnabled]);

  // Update countdown timer
  useEffect(() => {
    if (!canSpin && lastSpinTime) {
      const interval = setInterval(() => {
        const nextSpinTime = new Date(lastSpinTime).getTime() + 24 * 60 * 60 * 1000;
        const remaining = Math.max(0, nextSpinTime - Date.now());
        setTimeUntilNextSpin(remaining);
        
        if (remaining === 0) {
          setCanSpin(true);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [canSpin, lastSpinTime]);

  const checkFeatureEnabled = async () => {
    try {
      const { data, error } = await (supabase.from as any)("feature_toggles")
        .select("is_enabled")
        .eq("feature_name", "spin_wheel")
        .single();
      
      // Default to enabled if error or no data
      setFeatureEnabled(error ? true : (data?.is_enabled !== false));
    } catch {
      // Default to enabled on error
      setFeatureEnabled(true);
    }
  };

  const fetchWheelData = async () => {
    setIsLoading(true);
    const { data } = await (supabase.from as any)("spin_wheel_segments")
      .select("*")
      .eq("is_active", true)
      .order("position");

    if (data && data.length > 0) {
      setSegments(data);
    } else {
      // Default segments
      setSegments([
        { id: "1", label: "50 Points", value: 50, type: "points", color: "#FF6B6B", probability: 30 },
        { id: "2", label: "10% OFF", value: 10, type: "discount_percent", color: "#4ECDC4", probability: 15 },
        { id: "3", label: "100 Points", value: 100, type: "points", color: "#45B7D1", probability: 20 },
        { id: "4", label: "Free Delivery", value: 0, type: "free_delivery", color: "#96CEB4", probability: 10 },
        { id: "5", label: "Try Again", value: 0, type: "nothing", color: "#FFEAA7", probability: 20 },
        { id: "6", label: "₹20 OFF", value: 20, type: "discount_fixed", color: "#DDA0DD", probability: 5 }
      ]);
    }
    setIsLoading(false);
  };

  const checkSpinEligibility = async () => {
    if (!user) return;

    const { data } = await (supabase.from as any)("spin_history")
      .select("spun_at")
      .eq("user_id", user.id)
      .order("spun_at", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastSpin = new Date(data[0].spun_at);
      setLastSpinTime(lastSpin);
      
      const hoursSinceLastSpin = (Date.now() - lastSpin.getTime()) / (1000 * 60 * 60);
      setCanSpin(hoursSinceLastSpin >= 24);
    } else {
      setCanSpin(true);
    }
  };

  const spinWheel = useCallback(async () => {
    if (!user || isSpinning || !canSpin) return;

    setIsSpinning(true);
    setShowResult(false);

    // Haptic feedback
    if ("vibrate" in navigator) {
      navigator.vibrate([50]);
    }

    // Call backend to determine result
    const { data, error } = await (supabase.rpc as any)("perform_spin", {
      p_user_id: user.id
    });

    if (error || !data) {
      toast({
        title: "Spin failed",
        description: "Please try again later",
        variant: "destructive"
      });
      setIsSpinning(false);
      return;
    }

    // Find winning segment
    const winningSegment = segments.find(s => s.type === data.reward_type && s.value === data.reward_value)
      || segments[Math.floor(Math.random() * segments.length)];
    
    const segmentIndex = segments.indexOf(winningSegment);
    const segmentAngle = 360 / segments.length;
    
    // Calculate final rotation (multiple full rotations + landing on segment)
    const extraRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const targetAngle = segmentIndex * segmentAngle + segmentAngle / 2;
    const finalRotation = rotation + (extraRotations * 360) + (360 - targetAngle);

    // Animate wheel
    await controls.start({
      rotate: finalRotation,
      transition: {
        duration: 5,
        ease: [0.17, 0.67, 0.12, 0.99] // Custom easing for realistic spin
      }
    });

    setRotation(finalRotation);

    // Prepare result
    const spinResult: SpinResult = {
      segment: winningSegment,
      points_earned: data.reward_type === "points" ? data.reward_value : undefined,
      discount_code: data.discount_code
    };

    setResult(spinResult);
    setShowResult(true);
    setIsSpinning(false);
    setCanSpin(false);
    setLastSpinTime(new Date());

    // Celebrate!
    if (winningSegment.type !== "nothing") {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      if ("vibrate" in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100]);
      }
    }

    onRewardEarned?.(spinResult);
  }, [user, isSpinning, canSpin, segments, rotation, controls, toast, onRewardEarned]);

  const formatTimeRemaining = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (!featureEnabled) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const segmentAngle = 360 / segments.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full mb-3">
          <Sparkles className="text-yellow-500" size={18} />
          <span className="font-bold text-yellow-700">Daily Spin & Win</span>
          <Sparkles className="text-yellow-500" size={18} />
        </div>
        <p className="text-muted-foreground text-sm">
          Spin the wheel once a day for amazing rewards!
        </p>
      </div>

      {/* Wheel Container */}
      <div className="relative mx-auto" style={{ width: 320, height: 320 }}>
        {/* Outer ring decoration */}
        <div className="absolute inset-0 rounded-full border-8 border-yellow-500/30 p-2">
          {/* Dots around the wheel */}
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-yellow-500 rounded-full"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(-50%, -50%) rotate(${i * 15}deg) translateY(-148px)`
              }}
            />
          ))}
        </div>

        {/* Wheel */}
        <motion.div
          animate={controls}
          className="absolute inset-4 rounded-full overflow-hidden shadow-2xl"
          style={{ transformOrigin: "center" }}
        >
          <svg viewBox="0 0 200 200" className="w-full h-full">
            {segments.map((segment, index) => {
              const startAngle = index * segmentAngle;
              const endAngle = (index + 1) * segmentAngle;
              const midAngle = startAngle + segmentAngle / 2;
              
              // Calculate path for segment
              const startRad = (startAngle - 90) * (Math.PI / 180);
              const endRad = (endAngle - 90) * (Math.PI / 180);
              
              const x1 = 100 + 100 * Math.cos(startRad);
              const y1 = 100 + 100 * Math.sin(startRad);
              const x2 = 100 + 100 * Math.cos(endRad);
              const y2 = 100 + 100 * Math.sin(endRad);
              
              const largeArc = segmentAngle > 180 ? 1 : 0;

              // Label position
              const labelRad = (midAngle - 90) * (Math.PI / 180);
              const labelX = 100 + 60 * Math.cos(labelRad);
              const labelY = 100 + 60 * Math.sin(labelRad);

              return (
                <g key={segment.id}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize="10"
                    fontWeight="bold"
                    transform={`rotate(${midAngle}, ${labelX}, ${labelY})`}
                    className="drop-shadow-lg"
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </motion.div>

        {/* Center button */}
        <motion.button
          whileHover={{ scale: canSpin && !isSpinning ? 1.1 : 1 }}
          whileTap={{ scale: canSpin && !isSpinning ? 0.95 : 1 }}
          onClick={spinWheel}
          disabled={!canSpin || isSpinning}
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            "w-20 h-20 rounded-full shadow-lg z-10 flex flex-col items-center justify-center",
            "transition-all",
            canSpin && !isSpinning
              ? "bg-gradient-to-br from-yellow-400 to-orange-500 cursor-pointer"
              : "bg-muted cursor-not-allowed"
          )}
        >
          {isSpinning ? (
            <Loader2 className="animate-spin text-white" size={24} />
          ) : canSpin ? (
            <>
              <span className="text-white font-bold text-sm">SPIN</span>
              <Gift className="text-white" size={18} />
            </>
          ) : (
            <Clock className="text-muted-foreground" size={24} />
          )}
        </motion.button>

        {/* Pointer */}
        <div 
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20"
          style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
        >
          <svg width="30" height="40" viewBox="0 0 30 40">
            <polygon points="15,40 0,0 30,0" fill="#FFD700" />
            <polygon points="15,35 5,5 25,5" fill="#FFA500" />
          </svg>
        </div>
      </div>

      {/* Next spin timer */}
      {!canSpin && timeUntilNextSpin > 0 && (
        <div className="text-center p-4 bg-muted/50 rounded-xl">
          <p className="text-sm text-muted-foreground">Next spin available in</p>
          <p className="text-lg font-bold text-primary">
            {formatTimeRemaining(timeUntilNextSpin)}
          </p>
        </div>
      )}

      {/* Result Modal */}
      <AnimatePresence>
        {showResult && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.5, y: 50 }}
              className="bg-card rounded-2xl p-6 max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowResult(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-muted"
              >
                <X size={20} />
              </button>

              {result.segment.type === "nothing" ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <Info size={32} className="text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Better luck next time!</h3>
                  <p className="text-muted-foreground">
                    Come back tomorrow for another spin
                  </p>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: result.segment.color }}
                  >
                    {result.segment.type === "points" ? (
                      <Coins className="text-white" size={36} />
                    ) : result.segment.type === "free_delivery" ? (
                      <Gift className="text-white" size={36} />
                    ) : (
                      <Trophy className="text-white" size={36} />
                    )}
                  </motion.div>

                  <div className="flex items-center justify-center gap-2 mb-2">
                    <PartyPopper className="text-yellow-500" size={24} />
                    <h3 className="text-xl font-bold">Congratulations!</h3>
                    <PartyPopper className="text-yellow-500" size={24} />
                  </div>

                  <p className="text-2xl font-bold mb-2" style={{ color: result.segment.color }}>
                    {result.segment.label}
                  </p>

                  <p className="text-muted-foreground mb-4">
                    {result.segment.type === "points" && "Points added to your wallet!"}
                    {result.segment.type === "discount_percent" && "Discount applied to your next order!"}
                    {result.segment.type === "discount_fixed" && "Discount applied to your next order!"}
                    {result.segment.type === "free_delivery" && "Free delivery on your next order!"}
                  </p>

                  {result.discount_code && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Use code:</p>
                      <p className="font-mono font-bold text-lg">{result.discount_code}</p>
                    </div>
                  )}
                </>
              )}

              <button
                onClick={() => setShowResult(false)}
                className="mt-6 w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MINI SPIN WIDGET (For Homepage)
// ============================================

interface MiniSpinWidgetProps {
  onOpenFullWheel: () => void;
}

export function MiniSpinWidget({ onOpenFullWheel }: MiniSpinWidgetProps) {
  const { user } = useAuth();
  const [canSpin, setCanSpin] = useState(false);
  const [featureEnabled, setFeatureEnabled] = useState(false);

  useEffect(() => {
    checkFeatureAndEligibility();
  }, [user]);

  const checkFeatureAndEligibility = async () => {
    // Default feature to enabled - skip feature check to avoid errors
    setFeatureEnabled(true);

    if (!user) return;

    try {
      const { data } = await (supabase.from as any)("spin_history")
        .select("spun_at")
        .eq("user_id", user.id)
        .order("spun_at", { ascending: false })
        .limit(1);

      if (!data || data.length === 0) {
        setCanSpin(true);
      } else {
        const lastSpin = new Date(data[0].spun_at);
        const hoursSinceLastSpin = (Date.now() - lastSpin.getTime()) / (1000 * 60 * 60);
        setCanSpin(hoursSinceLastSpin >= 24);
      }
    } catch {
      setCanSpin(true);
    }
  };

  if (!featureEnabled || !canSpin) return null;

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onOpenFullWheel}
      className="fixed bottom-24 right-4 z-40"
    >
      <div className="relative">
        {/* Pulsing ring */}
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-yellow-500/30 rounded-full"
        />
        
        {/* Main button */}
        <div className="relative w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="text-white" size={28} />
          </motion.div>
        </div>

        {/* Badge */}
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
          1
        </span>
      </div>
    </motion.button>
  );
}
