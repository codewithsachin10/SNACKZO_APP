import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Gift, Trophy, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { isToday } from 'date-fns';
import confetti from '@/lib/confetti';

export function StreakWidget() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const currentStreak = (profile as any)?.current_streak || 0;
  const lastCheckin = (profile as any)?.last_checkin_date;
  const hasCheckedInToday = lastCheckin ? isToday(new Date(lastCheckin)) : false;

  const handleCheckin = async () => {
    if (!user || hasCheckedInToday) return;

    setIsCheckingIn(true);

    try {
      const { data, error } = await supabase.rpc('daily_checkin' as any, {
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data?.[0];
      if (result && result.points_earned > 0) {
        confetti();
        toast.success(`🎉 +${result.points_earned} points!`, {
          description: `Day ${result.new_streak} streak!`,
        });
        await refreshProfile();
      }
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setIsCheckingIn(false);
    }
  };

  if (!user) return null;

  return (
    <Card 
      className="neu-card overflow-hidden cursor-pointer hover:border-lime transition-colors"
      onClick={() => navigate('/achievements')}
    >
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                  <Flame className="text-white" size={24} />
                </div>
                {currentStreak > 0 && (
                  <Badge className="absolute -top-1 -right-1 bg-background text-foreground text-xs px-1.5">
                    {currentStreak}
                  </Badge>
                )}
              </div>
              <div>
                <p className="font-bold">
                  {currentStreak > 0 ? `${currentStreak} Day Streak! 🔥` : 'Start Your Streak!'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {hasCheckedInToday
                    ? 'Come back tomorrow!'
                    : 'Check in daily to earn bonus points'}
                </p>
              </div>
            </div>

            {!hasCheckedInToday ? (
              <Button
                size="sm"
                className="bg-lime text-background"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCheckin();
                }}
                disabled={isCheckingIn}
              >
                {isCheckingIn ? '...' : (
                  <>
                    <Gift size={16} className="mr-1" />
                    Claim
                  </>
                )}
              </Button>
            ) : (
              <ChevronRight className="text-muted-foreground" size={20} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StreakWidget;
