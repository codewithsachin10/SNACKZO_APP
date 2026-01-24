import { useState, useEffect, useCallback } from 'react';
import { Copy, Share2, Users, Gift, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface ReferralCode {
  code: string;
  uses_count: number;
  reward_amount: number;
}

interface Referral {
  id: string;
  referred_id: string;
  status: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export function ReferralProgram() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const fetchReferralData = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get or create referral code
      let { data: codeData, error: fetchError } = await (supabase
        .from('referral_codes' as any)
        .select('*')
        .eq('user_id', user.id)
        .single() as any);

      if (!codeData || fetchError) {
        // Try to generate new code using RPC
        try {
          const { error: rpcError } = await supabase.rpc('generate_referral_code' as any, { p_user_id: user.id });
          
          if (!rpcError) {
            // Fetch the newly created code
            const { data } = await (supabase
              .from('referral_codes' as any)
              .select('*')
              .eq('user_id', user.id)
              .single() as any);
            codeData = data;
          }
        } catch (rpcErr) {
          console.error('RPC error:', rpcErr);
          // Fallback: Create code directly
          const fallbackCode = 'HM' + Math.random().toString(36).substring(2, 8).toUpperCase();
          const { data: insertedCode } = await (supabase
            .from('referral_codes' as any)
            .insert({
              user_id: user.id,
              code: fallbackCode,
              uses_count: 0,
              reward_amount: 50,
              is_active: true
            })
            .select()
            .single() as any);
          codeData = insertedCode;
        }
      }

      if (codeData) {
        setReferralCode(codeData as ReferralCode);
      }

      // Get referrals
      const { data: referralsData } = await (supabase
        .from('referrals' as any)
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false }) as any);

      if (referralsData) {
        setReferrals(referralsData as Referral[]);
      }
    } catch (error) {
      console.error('Error fetching referral data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchReferralData();
  }, [fetchReferralData]);

  const copyCode = async () => {
    if (!referralCode) return;

    await navigator.clipboard.writeText(referralCode.code);
    setIsCopied(true);
    toast({ title: 'Code copied!', description: 'Share it with your friends' });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareCode = async () => {
    if (!referralCode) return;

    const shareText = `🛒 Join Hostel Mart and get ₹${referralCode.reward_amount / 2} off on your first order! Use my referral code: ${referralCode.code}\n\nDownload now and enjoy late-night snack deliveries! 🌙`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hostel Mart Referral',
          text: shareText,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: 'Share text copied!', description: 'Paste it to share with friends' });
    }
  };

  const applyReferralCode = async () => {
    if (!user || !inputCode.trim()) return;

    setIsApplying(true);

    try {
      // Check if code exists and is valid
      const { data: codeData, error: codeError } = await (supabase
        .from('referral_codes' as any)
        .select('*')
        .eq('code', inputCode.toUpperCase())
        .eq('is_active', true)
        .single() as any);

      if (codeError || !codeData) {
        toast({ title: 'Invalid code', description: 'This referral code does not exist', variant: 'destructive' });
        return;
      }

      // Check if user is trying to use their own code
      if (codeData.user_id === user.id) {
        toast({ title: 'Error', description: "You can't use your own referral code", variant: 'destructive' });
        return;
      }

      // Check if user has already been referred
      const { data: existingReferral } = await (supabase
        .from('referrals' as any)
        .select('*')
        .eq('referred_id', user.id)
        .single() as any);

      if (existingReferral) {
        toast({ title: 'Already referred', description: 'You have already used a referral code', variant: 'destructive' });
        return;
      }

      // Create referral
      const { error: insertError } = await (supabase
        .from('referrals' as any)
        .insert({
          referrer_id: codeData.user_id,
          referred_id: user.id,
          referral_code: inputCode.toUpperCase(),
          status: 'pending',
        }) as any);

      if (insertError) throw insertError;

      toast({
        title: 'Referral code applied! 🎉',
        description: `You'll receive ₹${codeData.reward_amount / 2} after your first order!`,
      });
      setInputCode('');
    } catch (error) {
      console.error('Error applying referral code:', error);
      toast({ title: 'Error', description: 'Failed to apply referral code', variant: 'destructive' });
    } finally {
      setIsApplying(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Please sign in to access the referral program.
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

  return (
    <div className="space-y-6">
      {/* Your Referral Code */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Your Referral Code
          </CardTitle>
          <CardDescription>
            Share your code and earn ₹{referralCode?.reward_amount || 50} for each friend who joins!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Input
                value={referralCode?.code || 'Loading...'}
                readOnly
                className="text-center text-xl font-bold tracking-widest bg-background"
              />
            </div>
            <Button variant="outline" size="icon" onClick={copyCode}>
              {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button onClick={shareCode}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold mb-2">How it works:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>1. Share your code with friends</li>
              <li>2. They sign up and use your code</li>
              <li>3. When they complete their first order, you both get rewarded!</li>
              <li>4. You get ₹{referralCode?.reward_amount || 50}, they get ₹{(referralCode?.reward_amount || 50) / 2}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Apply Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle>Have a referral code?</CardTitle>
          <CardDescription>
            Enter a friend's referral code to get bonus credits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., HM1A2B3C)"
              className="uppercase tracking-widest"
            />
            <Button onClick={applyReferralCode} disabled={isApplying || !inputCode.trim()}>
              {isApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{referrals.length}</p>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold">{referrals.filter(r => r.status === 'rewarded').length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-bold text-green-500">
                ₹{referrals.filter(r => r.status === 'rewarded').length * (referralCode?.reward_amount || 50)}
              </p>
              <p className="text-sm text-muted-foreground">Earned</p>
            </div>
          </div>

          {referrals.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No referrals yet. Share your code to start earning!
            </p>
          ) : (
            <div className="space-y-2">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="font-medium">{referral.profiles?.full_name || 'Anonymous User'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(referral.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={referral.status === 'rewarded' ? 'default' : 'secondary'}>
                    {referral.status === 'rewarded' ? '✓ Rewarded' : referral.status === 'completed' ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
