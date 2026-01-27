import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Star, Shield, Flame, Target, Crown, Zap, Heart,
  Award, Medal, Gift, Sparkles, Lock, ChevronRight, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requirement: {
    type: string;
    value: number;
  };
  is_earned: boolean;
  progress?: number;
  earned_at?: string;
}

interface AchievementDisplayProps {
  userId?: string;
  compact?: boolean;
}

const BADGE_ICONS: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  shield: Shield,
  flame: Flame,
  target: Target,
  crown: Crown,
  zap: Zap,
  heart: Heart,
  award: Award,
  medal: Medal,
  gift: Gift,
  sparkles: Sparkles
};

const DEFAULT_BADGES: Badge[] = [
  {
    id: "first_order",
    name: "First Steps",
    description: "Place your first order",
    icon: "star",
    color: "#4ECDC4",
    requirement: { type: "orders", value: 1 },
    is_earned: false
  },
  {
    id: "five_orders",
    name: "Regular",
    description: "Complete 5 orders",
    icon: "flame",
    color: "#FF6B6B",
    requirement: { type: "orders", value: 5 },
    is_earned: false
  },
  {
    id: "ten_orders",
    name: "Loyal Customer",
    description: "Complete 10 orders",
    icon: "heart",
    color: "#FF69B4",
    requirement: { type: "orders", value: 10 },
    is_earned: false
  },
  {
    id: "twenty_five_orders",
    name: "Power User",
    description: "Complete 25 orders",
    icon: "zap",
    color: "#FFD700",
    requirement: { type: "orders", value: 25 },
    is_earned: false
  },
  {
    id: "fifty_orders",
    name: "Champion",
    description: "Complete 50 orders",
    icon: "trophy",
    color: "#9B59B6",
    requirement: { type: "orders", value: 50 },
    is_earned: false
  },
  {
    id: "hundred_orders",
    name: "Legend",
    description: "Complete 100 orders",
    icon: "crown",
    color: "#E74C3C",
    requirement: { type: "orders", value: 100 },
    is_earned: false
  },
  {
    id: "first_review",
    name: "Voice Heard",
    description: "Write your first review",
    icon: "star",
    color: "#3498DB",
    requirement: { type: "reviews", value: 1 },
    is_earned: false
  },
  {
    id: "five_reviews",
    name: "Critic",
    description: "Write 5 reviews",
    icon: "award",
    color: "#2ECC71",
    requirement: { type: "reviews", value: 5 },
    is_earned: false
  },
  {
    id: "referral_one",
    name: "Ambassador",
    description: "Refer your first friend",
    icon: "gift",
    color: "#E91E63",
    requirement: { type: "referrals", value: 1 },
    is_earned: false
  },
  {
    id: "referral_five",
    name: "Influencer",
    description: "Refer 5 friends",
    icon: "sparkles",
    color: "#00BCD4",
    requirement: { type: "referrals", value: 5 },
    is_earned: false
  },
  {
    id: "high_spender",
    name: "Big Spender",
    description: "Spend ₹5000 in total",
    icon: "shield",
    color: "#673AB7",
    requirement: { type: "spending", value: 5000 },
    is_earned: false
  },
  {
    id: "streak_seven",
    name: "Week Warrior",
    description: "Order 7 days in a row",
    icon: "target",
    color: "#FF5722",
    requirement: { type: "streak", value: 7 },
    is_earned: false
  }
];

export function AchievementDisplay({ userId, compact = false }: AchievementDisplayProps) {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>(DEFAULT_BADGES);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalReviews: 0,
    totalReferrals: 0,
    totalSpending: 0,
    currentStreak: 0
  });
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      fetchUserStats();
    }
  }, [targetUserId]);

  const fetchUserStats = async () => {
    setIsLoading(true);

    // Fetch order count
    const { count: orderCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId)
      .eq("status", "delivered");

    // Fetch review count
    const { count: reviewCount } = await (supabase.from as any)("reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", targetUserId);

    // Fetch referral count
    const { count: referralCount } = await (supabase.from as any)("referrals")
      .select("*", { count: "exact", head: true })
      .eq("referrer_id", targetUserId)
      .in("status", ["completed", "rewarded"]);

    // Fetch total spending
    const { data: spendingData } = await supabase
      .from("orders")
      .select("total")
      .eq("user_id", targetUserId)
      .eq("status", "delivered");

    const totalSpending = spendingData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;

    const newStats = {
      totalOrders: orderCount || 0,
      totalReviews: reviewCount || 0,
      totalReferrals: referralCount || 0,
      totalSpending,
      currentStreak: 0 // TODO: Calculate streak
    };

    setStats(newStats);

    // Update badges with earned status and progress
    const updatedBadges = DEFAULT_BADGES.map(badge => {
      let currentValue = 0;
      switch (badge.requirement.type) {
        case "orders":
          currentValue = newStats.totalOrders;
          break;
        case "reviews":
          currentValue = newStats.totalReviews;
          break;
        case "referrals":
          currentValue = newStats.totalReferrals;
          break;
        case "spending":
          currentValue = newStats.totalSpending;
          break;
        case "streak":
          currentValue = newStats.currentStreak;
          break;
      }

      return {
        ...badge,
        is_earned: currentValue >= badge.requirement.value,
        progress: Math.min(100, (currentValue / badge.requirement.value) * 100)
      };
    });

    setBadges(updatedBadges);
    setIsLoading(false);
  };

  const earnedBadges = badges.filter(b => b.is_earned);
  const upcomingBadges = badges.filter(b => !b.is_earned).slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-12 h-12 bg-muted animate-pulse rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  // Compact view for profile preview
  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            Achievements
          </h3>
          <span className="text-sm text-muted-foreground">
            {earnedBadges.length}/{badges.length}
          </span>
        </div>

        {/* Earned badges row */}
        {earnedBadges.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {earnedBadges.map((badge) => {
              const IconComponent = BADGE_ICONS[badge.icon] || Star;
              return (
                <motion.button
                  key={badge.id}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedBadge(badge)}
                  className="relative shrink-0"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: badge.color }}
                  >
                    <IconComponent size={24} className="text-white" />
                  </div>
                </motion.button>
              );
            })}
            {earnedBadges.length < badges.length && (
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                <span className="text-xs text-muted-foreground font-medium">
                  +{badges.length - earnedBadges.length}
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Complete orders to earn badges!
          </p>
        )}

        {/* Badge detail modal */}
        <BadgeDetailModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      </div>
    );
  }

  // Full achievement display
  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Trophy className="text-yellow-500" size={24} />
            Achievements
          </h2>
          <p className="text-sm text-muted-foreground">
            {earnedBadges.length} of {badges.length} badges earned
          </p>
        </div>

        {/* Progress ring */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth="6"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeDasharray={`${(earnedBadges.length / badges.length) * 176} 176`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold">
              {Math.round((earnedBadges.length / badges.length) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Target size={18} />} label="Orders" value={stats.totalOrders} />
        <StatCard icon={<Star size={18} />} label="Reviews" value={stats.totalReviews} />
        <StatCard icon={<Gift size={18} />} label="Referrals" value={stats.totalReferrals} />
        <StatCard icon={<Zap size={18} />} label="Spent" value={`₹${stats.totalSpending}`} />
      </div>

      {/* Earned badges */}
      {earnedBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Earned Badges</h3>
          <div className="grid grid-cols-4 gap-4">
            {earnedBadges.map((badge) => {
              const IconComponent = BADGE_ICONS[badge.icon] || Star;
              return (
                <motion.button
                  key={badge.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedBadge(badge)}
                  className="flex flex-col items-center gap-2"
                >
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: badge.color }}
                  >
                    <IconComponent size={28} className="text-white" />
                  </motion.div>
                  <span className="text-xs text-center font-medium line-clamp-1">
                    {badge.name}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming badges */}
      {upcomingBadges.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold">Up Next</h3>
          <div className="space-y-3">
            {upcomingBadges.map((badge) => {
              const IconComponent = BADGE_ICONS[badge.icon] || Star;
              return (
                <motion.button
                  key={badge.id}
                  whileHover={{ x: 5 }}
                  onClick={() => setSelectedBadge(badge)}
                  className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl"
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center opacity-50"
                    style={{ backgroundColor: badge.color }}
                  >
                    <IconComponent size={24} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium flex items-center gap-2">
                      {badge.name}
                      <Lock size={12} className="text-muted-foreground" />
                    </p>
                    <p className="text-sm text-muted-foreground">{badge.description}</p>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${badge.progress}%`,
                          backgroundColor: badge.color
                        }}
                      />
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* All badges grid */}
      <div className="space-y-3">
        <h3 className="font-semibold">All Badges</h3>
        <div className="grid grid-cols-4 gap-4">
          {badges.map((badge) => {
            const IconComponent = BADGE_ICONS[badge.icon] || Star;
            return (
              <motion.button
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBadge(badge)}
                className={cn(
                  "flex flex-col items-center gap-2",
                  !badge.is_earned && "opacity-40"
                )}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    badge.is_earned ? "shadow-lg" : "bg-muted"
                  )}
                  style={badge.is_earned ? { backgroundColor: badge.color } : undefined}
                >
                  {badge.is_earned ? (
                    <IconComponent size={24} className="text-white" />
                  ) : (
                    <Lock size={20} className="text-muted-foreground" />
                  )}
                </div>
                <span className="text-xs text-center font-medium line-clamp-1">
                  {badge.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Badge detail modal */}
      <BadgeDetailModal
        badge={selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </div>
  );
}

// ============================================
// STAT CARD
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="p-3 bg-muted/50 rounded-xl">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="font-bold text-lg">{value}</p>
    </div>
  );
}

// ============================================
// BADGE DETAIL MODAL
// ============================================

interface BadgeDetailModalProps {
  badge: Badge | null;
  onClose: () => void;
}

function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  if (!badge) return null;

  const IconComponent = BADGE_ICONS[badge.icon] || Star;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.5, y: 50 }}
          className="bg-card rounded-2xl p-6 max-w-xs w-full text-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Badge icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: badge.is_earned ? [0, 360] : 0 }}
            transition={{ type: "spring", delay: 0.2 }}
            className={cn(
              "w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center",
              badge.is_earned ? "shadow-xl" : "bg-muted"
            )}
            style={badge.is_earned ? { backgroundColor: badge.color } : undefined}
          >
            {badge.is_earned ? (
              <IconComponent size={48} className="text-white" />
            ) : (
              <Lock size={36} className="text-muted-foreground" />
            )}
          </motion.div>

          <h3 className="text-xl font-bold mb-2">{badge.name}</h3>
          <p className="text-muted-foreground mb-4">{badge.description}</p>

          {/* Progress */}
          {!badge.is_earned && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(badge.progress || 0)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${badge.progress}%` }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: badge.color }}
                />
              </div>
            </div>
          )}

          {badge.is_earned && badge.earned_at && (
            <p className="text-xs text-muted-foreground mb-4">
              Earned on {new Date(badge.earned_at).toLocaleDateString()}
            </p>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
          >
            {badge.is_earned ? "Awesome!" : "Keep Going!"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Mini display component for profile pages
export function AchievementMiniDisplay() {
  return <AchievementDisplay compact />;
}
