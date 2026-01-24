import { useState, useEffect } from 'react';
import { Bell, BellOff, Package, Tag, Truck, Wallet, Star, Mail, MessageSquare, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { toast } from '@/hooks/use-toast';

interface NotificationPreferences {
  id?: string;
  order_updates: boolean;
  promotions: boolean;
  offers: boolean;
  delivery_updates: boolean;
  wallet_updates: boolean;
  review_reminders: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  sms_notifications: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}

const defaultPreferences: NotificationPreferences = {
  order_updates: true,
  promotions: true,
  offers: true,
  delivery_updates: true,
  wallet_updates: true,
  review_reminders: true,
  email_notifications: true,
  push_notifications: true,
  sms_notifications: false,
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('notification_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .single() as any);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data as NotificationPreferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);
    setIsSaving(true);

    try {
      const { error } = await (supabase
        .from('notification_preferences' as any)
        .upsert({
          user_id: user.id,
          ...newPreferences,
        }, {
          onConflict: 'user_id'
        }) as any);

      if (error) throw error;

      // Handle push notification toggle
      if (key === 'push_notifications') {
        if (value && !isSubscribed) {
          await subscribe();
        } else if (!value && isSubscribed) {
          await unsubscribe();
        }
      }

      toast({
        title: 'Preferences saved',
        description: 'Your notification preferences have been updated.',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
      // Revert on error
      setPreferences(preferences);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Please sign in to manage notification preferences.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading preferences...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>
            Choose how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="push">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications on this device
                </p>
              </div>
            </div>
            <Switch
              id="push"
              checked={preferences.push_notifications}
              onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
              disabled={!isSupported || isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <Label htmlFor="email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageSquare className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <Label htmlFor="sms">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive text messages for important updates
                </p>
              </div>
            </div>
            <Switch
              id="sms"
              checked={preferences.sms_notifications}
              onCheckedChange={(checked) => updatePreference('sms_notifications', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <Label htmlFor="order_updates">Order Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Order confirmation, preparation, and delivery status
                </p>
              </div>
            </div>
            <Switch
              id="order_updates"
              checked={preferences.order_updates}
              onCheckedChange={(checked) => updatePreference('order_updates', checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Truck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <Label htmlFor="delivery_updates">Delivery Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Real-time runner location and ETA updates
                </p>
              </div>
            </div>
            <Switch
              id="delivery_updates"
              checked={preferences.delivery_updates}
              onCheckedChange={(checked) => updatePreference('delivery_updates', checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Tag className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <Label htmlFor="promotions">Promotions</Label>
                <p className="text-sm text-muted-foreground">
                  Special deals, flash sales, and discounts
                </p>
              </div>
            </div>
            <Switch
              id="promotions"
              checked={preferences.promotions}
              onCheckedChange={(checked) => updatePreference('promotions', checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Wallet className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <Label htmlFor="wallet_updates">Wallet Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Balance changes, rewards, and referral credits
                </p>
              </div>
            </div>
            <Switch
              id="wallet_updates"
              checked={preferences.wallet_updates}
              onCheckedChange={(checked) => updatePreference('wallet_updates', checked)}
              disabled={isSaving}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Star className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <Label htmlFor="review_reminders">Review Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Reminders to rate and review your orders
                </p>
              </div>
            </div>
            <Switch
              id="review_reminders"
              checked={preferences.review_reminders}
              onCheckedChange={(checked) => updatePreference('review_reminders', checked)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Pause non-urgent notifications during specific hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="quiet_start">Start Time</Label>
              <Input
                id="quiet_start"
                type="time"
                value={preferences.quiet_hours_start || '22:00'}
                onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                disabled={isSaving}
                className="mt-1"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="quiet_end">End Time</Label>
              <Input
                id="quiet_end"
                type="time"
                value={preferences.quiet_hours_end || '07:00'}
                onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                disabled={isSaving}
                className="mt-1"
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Important order updates will still come through during quiet hours.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
