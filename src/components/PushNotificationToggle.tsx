import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAuth } from '@/contexts/AuthContext';

export function PushNotificationToggle() {
  const { user } = useAuth();
  const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  if (!user || !isSupported) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      title={isSubscribed ? 'Disable notifications' : 'Enable notifications'}
    >
      {isSubscribed ? (
        <Bell className="h-5 w-5 text-primary" />
      ) : (
        <BellOff className="h-5 w-5 text-muted-foreground" />
      )}
    </Button>
  );
}
