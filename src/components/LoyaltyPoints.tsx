import { useState, useEffect, useCallback } from 'react';
import { Trophy, Star, Gift, Zap, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface LoyaltyStats {
  loyalty_points: number;
  lifetime_points: number;
  loyalty_tier: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  reward_type: string;
  reward_value: number;
  min_tier: string;
}

interface LoyaltyTransaction {
  id: string;
  points: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

const tierColors = {
  bronze: 'bg-amber-700 text-white',
  silver: 'bg-gray-400 text-white',
  gold: 'bg-yellow-500 text-white',
  platinum: 'bg-purple-600 text-white',
};

const tierIcons = {
  bronze: '🥉',
  silver: '🥈',
  gold: '🥇',
  platinum: '💎',
};

const tierThresholds = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
};

export function LoyaltyPoints() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState<LoyaltyStats | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Get user stats from profile
      if (profile) {
        setStats({
          loyalty_points: (profile as any).loyalty_points || 0,
          lifetime_points: (profile as any).lifetime_points || 0,
          loyalty_tier: (profile as any).loyalty_tier || 'bronze',
        });
      }

      // Get available rewards
      const { data: rewardsData } = await (supabase
        .from('loyalty_rewards' as any)
        .select('*')
        .eq('is_active', true)
        .order('points_required', { ascending: true }) as any);

      if (rewardsData) {
        setRewards(rewardsData as LoyaltyReward[]);
      }

      // Get recent transactions
      const { data: transactionsData } = await (supabase
        .from('loyalty_transactions' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10) as any);

      if (transactionsData) {
        setTransactions(transactionsData as LoyaltyTransaction[]);
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getNextTier = () => {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const currentIndex = tiers.indexOf(stats?.loyalty_tier || 'bronze');
    return currentIndex < tiers.length - 1 ? tiers[currentIndex + 1] : null;
  };

  const getProgressToNextTier = () => {
    const nextTier = getNextTier();
    if (!nextTier || !stats) return 100;

    const currentThreshold = tierThresholds[stats.loyalty_tier as keyof typeof tierThresholds];
    const nextThreshold = tierThresholds[nextTier as keyof typeof tierThresholds];
    const progress = ((stats.lifetime_points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  const canRedeem = (reward: LoyaltyReward) => {
    if (!stats) return false;
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const userTierIndex = tierOrder.indexOf(stats.loyalty_tier);
    const requiredTierIndex = tierOrder.indexOf(reward.min_tier);
    return stats.loyalty_points >= reward.points_required && userTierIndex >= requiredTierIndex;
  };

  const redeemReward = async (reward: LoyaltyReward) => {
    if (!user || !canRedeem(reward)) return;

    setIsRedeeming(reward.id);

    try {
      const { data, error } = await supabase.rpc('redeem_loyalty_points' as any, {
        p_user_id: user.id,
        p_points: reward.points_required,
        p_description: `Redeemed: ${reward.name}`,
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Reward redeemed! 🎉',
          description: `${reward.name} has been applied to your account.`,
        });
        fetchData();
      } else {
        toast({
          title: 'Insufficient points',
          description: 'You don\'t have enough points for this reward.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast({
        title: 'Error',
        description: 'Failed to redeem reward. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRedeeming(null);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Please sign in to view your loyalty points.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const tier = stats?.loyalty_tier || 'bronze';
  const nextTier = getNextTier();

  return (
    <div className="space-y-6">
      {/* Points Overview */}
      <Card className={`border-0 ${tierColors[tier as keyof typeof tierColors]}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-80">Your Points</p>
              <p className="text-4xl font-bold">{stats?.loyalty_points || 0}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 text-white text-lg px-3 py-1">
                {tierIcons[tier as keyof typeof tierIcons]} {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </Badge>
            </div>
          </div>

          {nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm opacity-80">
                <span>Progress to {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}</span>
                <span>{stats?.lifetime_points || 0} / {tierThresholds[nextTier as keyof typeof tierThresholds]} pts</span>
              </div>
              <Progress value={getProgressToNextTier()} className="bg-white/20" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Earn */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            How to Earn Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Star className="h-4 w-4 text-primary" />
                </div>
                <span>Place an order</span>
              </div>
              <span className="font-semibold text-primary">1 pt / ₹10</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Gift className="h-4 w-4 text-green-600" />
                </div>
                <span>Refer a friend</span>
              </div>
              <span className="font-semibold text-green-600">50 bonus pts</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Trophy className="h-4 w-4 text-purple-600" />
                </div>
                <span>Higher tier = More points</span>
              </div>
              <span className="font-semibold text-purple-600">Up to 2x</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Redeem Rewards
          </CardTitle>
          <CardDescription>
            Use your points to unlock exclusive rewards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {rewards.map((reward) => {
              const canGet = canRedeem(reward);
              return (
                <div
                  key={reward.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    canGet ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{reward.name}</p>
                      <Badge variant="outline" className="text-xs">
                        {reward.min_tier.charAt(0).toUpperCase() + reward.min_tier.slice(1)}+
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{reward.description}</p>
                    <p className="text-sm font-medium text-primary mt-1">
                      {reward.points_required} points
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={canGet ? 'default' : 'outline'}
                    disabled={!canGet || isRedeeming === reward.id}
                    onClick={() => redeemReward(reward)}
                  >
                    {isRedeeming === reward.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Redeem
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No transactions yet. Start earning points by placing orders!
            </p>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`font-bold ${tx.points > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.points > 0 ? '+' : ''}{tx.points} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
