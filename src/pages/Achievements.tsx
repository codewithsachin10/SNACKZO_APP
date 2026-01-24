import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Star, Flame, Gift, Target, Zap, Medal, Crown, 
  Calendar, CheckCircle, Lock, ArrowLeft, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, isToday, differenceInDays } from 'date-fns';
import Navbar from '@/components/Navbar';
import confetti from '@/lib/confetti';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  badge_type: 'achievement' | 'streak' | 'milestone' | 'special';
  requirement_type: string;
  requirement_value: number;
  points_reward: number;
  is_secret: boolean;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

interface DailyCheckin {
  id: string;
  checkin_date: string;
  points_earned: number;
  bonus_multiplier: number;
}

interface UserStats {
  total_orders: number;
  current_streak: number;
  longest_streak: number;
  loyalty_points: number;
  lifetime_points: number;
  badges_count: number;
  last_checkin_date: string | null;
}

const badgeTypeColors = {
  achievement: 'bg-purple-500',
  streak: 'bg-orange-500',
  milestone: 'bg-blue-500',
  special: 'bg-pink-500',
};

const badgeTypeLabels = {
  achievement: 'Achievement',
  streak: 'Streak',
  milestone: 'Milestone',
  special: 'Special',
};

const Achievements = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'streaks'>('overview');
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const stats: UserStats = {
    total_orders: (profile as any)?.total_orders || 0,
    current_streak: (profile as any)?.current_streak || 0,
    longest_streak: (profile as any)?.longest_streak || 0,
    loyalty_points: (profile as any)?.loyalty_points || 0,
    lifetime_points: (profile as any)?.lifetime_points || 0,
    badges_count: (profile as any)?.badges_count || 0,
    last_checkin_date: (profile as any)?.last_checkin_date || null,
  };

  const hasCheckedInToday = stats.last_checkin_date
    ? isToday(new Date(stats.last_checkin_date))
    : false;

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch all badges
      const { data: badgesData } = await (supabase
        .from('badges' as any)
        .select('*')
        .order('requirement_value') as any);

      if (badgesData) {
        setAllBadges(badgesData as Badge[]);
      }

      // Fetch user's earned badges
      const { data: userBadgesData } = await (supabase
        .from('user_badges' as any)
        .select('*, badge:badge_id(*)')
        .eq('user_id', user.id) as any);

      if (userBadgesData) {
        setUserBadges(userBadgesData as UserBadge[]);
      }

      // Fetch recent check-ins
      const { data: checkinsData } = await (supabase
        .from('daily_checkins' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
        .limit(30) as any);

      if (checkinsData) {
        setCheckins(checkinsData as DailyCheckin[]);
      }
    } catch (err) {
      console.error('Error fetching achievements:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchData();
  }, [user, navigate, fetchData]);

  const handleDailyCheckin = async () => {
    if (!user || hasCheckedInToday) return;

    setIsCheckingIn(true);

    try {
      const { data, error } = await supabase.rpc('daily_checkin' as any, {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (result && result.points_earned > 0) {
        // Trigger confetti
        confetti();
        
        toast.success(`🎉 +${result.points_earned} points earned!`, {
          description: `Day ${result.new_streak} streak! ${result.bonus_multiplier > 1 ? `${result.bonus_multiplier}x bonus!` : ''}`,
        });

        await refreshProfile();
        fetchData();
      } else {
        toast.info("You've already checked in today!");
      }
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error('Failed to check in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const hasBadge = (badgeId: string) => userBadges.some((ub) => ub.badge_id === badgeId);

  const getBadgeProgress = (badge: Badge) => {
    let current = 0;
    switch (badge.requirement_type) {
      case 'orders':
        current = stats.total_orders;
        break;
      case 'streak':
        current = stats.longest_streak;
        break;
      case 'spending':
        current = stats.lifetime_points;
        break;
      default:
        current = 0;
    }
    return Math.min(100, (current / badge.requirement_value) * 100);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-muted-foreground">Track your progress & earn rewards</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="neu-card text-center">
            <CardContent className="p-4">
              <Flame className="mx-auto mb-2 text-orange-500" size={24} />
              <p className="text-2xl font-bold">{stats.current_streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </CardContent>
          </Card>
          <Card className="neu-card text-center">
            <CardContent className="p-4">
              <Medal className="mx-auto mb-2 text-yellow-500" size={24} />
              <p className="text-2xl font-bold">{userBadges.length}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </CardContent>
          </Card>
          <Card className="neu-card text-center">
            <CardContent className="p-4">
              <Star className="mx-auto mb-2 text-lime" size={24} />
              <p className="text-2xl font-bold">{stats.loyalty_points}</p>
              <p className="text-xs text-muted-foreground">Points</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Check-in */}
        <Card className="neu-card mb-6 overflow-hidden">
          <div className="bg-gradient-to-r from-lime/20 to-cyan/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Calendar className="text-lime" size={20} />
                  Daily Check-in
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasCheckedInToday
                    ? 'Come back tomorrow for more points!'
                    : `Earn ${5 + Math.min(stats.current_streak, 10)}+ points today`}
                </p>
              </div>
              <Button
                className={`neu-btn ${hasCheckedInToday ? 'bg-muted' : 'bg-lime text-background'}`}
                onClick={handleDailyCheckin}
                disabled={hasCheckedInToday || isCheckingIn}
              >
                {isCheckingIn ? (
                  <span className="animate-spin">⏳</span>
                ) : hasCheckedInToday ? (
                  <>
                    <CheckCircle size={18} className="mr-2" />
                    Done
                  </>
                ) : (
                  <>
                    <Gift size={18} className="mr-2" />
                    Check In
                  </>
                )}
              </Button>
            </div>

            {/* Streak Calendar Preview */}
            <div className="flex gap-1 mt-4 justify-center">
              {[...Array(7)].map((_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                const hasCheckin = checkins.some(
                  (c) => c.checkin_date === format(date, 'yyyy-MM-dd')
                );
                const isCurrentDay = isToday(date);

                return (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      hasCheckin
                        ? 'bg-lime text-background'
                        : isCurrentDay
                        ? 'border-2 border-lime'
                        : 'bg-muted'
                    }`}
                  >
                    {format(date, 'd')}
                  </div>
                );
              })}
            </div>

            {/* Streak Multiplier Info */}
            {stats.current_streak > 0 && (
              <div className="mt-4 text-center">
                <Badge className="bg-orange-500 text-white">
                  🔥 {stats.current_streak} Day Streak = {Math.min(2, 1 + stats.current_streak * 0.1).toFixed(1)}x Multiplier
                </Badge>
              </div>
            )}
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="badges" className="flex items-center gap-2">
              <Medal size={16} />
              Badges
            </TabsTrigger>
            <TabsTrigger value="streaks" className="flex items-center gap-2">
              <Flame size={16} />
              History
            </TabsTrigger>
          </TabsList>

          {/* Badges Tab */}
          <TabsContent value="badges">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full mx-auto" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Earned Badges */}
                {userBadges.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3 flex items-center gap-2">
                      <Crown className="text-yellow-500" size={18} />
                      Earned ({userBadges.length})
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {userBadges.map((ub) => (
                        <Card key={ub.id} className="neu-card text-center">
                          <CardContent className="p-3">
                            <span className="text-3xl mb-2 block">
                              {(ub as any).badge?.icon || '🏆'}
                            </span>
                            <p className="font-medium text-xs truncate">
                              {(ub as any).badge?.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(ub.earned_at), 'MMM d')}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Badges */}
                <div>
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Target size={18} />
                    All Badges
                  </h3>
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {allBadges.map((badge) => {
                        const earned = hasBadge(badge.id);
                        const progress = getBadgeProgress(badge);

                        return (
                          <Card
                            key={badge.id}
                            className={`neu-card ${earned ? 'border-lime' : 'opacity-75'}`}
                          >
                            <CardContent className="p-3 flex items-center gap-3">
                              <div
                                className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                                  earned ? 'bg-lime/20' : 'bg-muted'
                                }`}
                              >
                                {badge.is_secret && !earned ? '❓' : badge.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-sm truncate">
                                    {badge.is_secret && !earned ? 'Secret Badge' : badge.name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${badgeTypeColors[badge.badge_type]} text-white border-0`}
                                  >
                                    {badgeTypeLabels[badge.badge_type]}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {badge.is_secret && !earned ? '???' : badge.description}
                                </p>
                                {!earned && (
                                  <Progress value={progress} className="h-1 mt-2" />
                                )}
                              </div>
                              <div className="text-right">
                                {earned ? (
                                  <CheckCircle className="text-lime" size={20} />
                                ) : (
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Star size={12} />
                                    +{badge.points_reward}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Streaks/History Tab */}
          <TabsContent value="streaks">
            <div className="space-y-4">
              {/* Streak Stats */}
              <div className="grid grid-cols-2 gap-3">
                <Card className="neu-card">
                  <CardContent className="p-4 text-center">
                    <Flame className="mx-auto mb-2 text-orange-500" size={32} />
                    <p className="text-3xl font-bold">{stats.current_streak}</p>
                    <p className="text-sm text-muted-foreground">Current Streak</p>
                  </CardContent>
                </Card>
                <Card className="neu-card">
                  <CardContent className="p-4 text-center">
                    <Trophy className="mx-auto mb-2 text-yellow-500" size={32} />
                    <p className="text-3xl font-bold">{stats.longest_streak}</p>
                    <p className="text-sm text-muted-foreground">Best Streak</p>
                  </CardContent>
                </Card>
              </div>

              {/* Check-in History */}
              <Card className="neu-card">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Check-ins</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {checkins.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No check-ins yet. Start your streak today!
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {checkins.map((checkin) => (
                          <div
                            key={checkin.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-lime/20 rounded-full flex items-center justify-center">
                                <CheckCircle size={16} className="text-lime" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  {format(new Date(checkin.checkin_date), 'EEEE, MMM d')}
                                </p>
                                {checkin.bonus_multiplier > 1 && (
                                  <p className="text-xs text-orange-500">
                                    {checkin.bonus_multiplier}x bonus
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline">+{checkin.points_earned} pts</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Achievements;
