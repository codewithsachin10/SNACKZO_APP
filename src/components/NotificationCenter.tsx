import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, Package, Tag, Truck, Wallet, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  priority: string;
  image_url?: string;
  action_url?: string;
  order_id?: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Package> = {
  order: Package,
  promo: Tag,
  delivery: Truck,
  wallet: Wallet,
  review: Star,
};

const typeColors: Record<string, string> = {
  order: 'bg-blue-100 text-blue-600',
  promo: 'bg-purple-100 text-purple-600',
  delivery: 'bg-green-100 text-green-600',
  wallet: 'bg-yellow-100 text-yellow-600',
  review: 'bg-orange-100 text-orange-600',
  general: 'bg-gray-100 text-gray-600',
};

export function NotificationCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(20) as any);

      if (error) throw error;
      setNotifications((data as Notification[]) || []);
      setUnreadCount(data?.filter((n: any) => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      // Subscribe to new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.body,
            });
          }
        )
        .subscribe();

      // Listen for service worker messages (prod only)
      if (import.meta.env.PROD && 'serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      }

      return () => {
        supabase.removeChannel(channel);
        if (import.meta.env.PROD && 'serviceWorker' in navigator) {
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        }
      };
    }
  }, [user, fetchNotifications]);

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === 'PUSH_NOTIFICATION') {
      // Refresh notifications when push is received
      fetchNotifications();
    } else if (event.data?.type === 'NOTIFICATION_ACTION') {
      // Handle notification action
      if (event.data.action === 'view' && event.data.data?.orderId) {
        navigate(`/orders/${event.data.data.orderId}`);
      }
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await (supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('id', notificationId) as any);

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      await (supabase
        .from('notifications' as any)
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false) as any);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      toast({
        title: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const archiveNotification = async (notificationId: string) => {
    try {
      await (supabase
        .from('notifications' as any)
        .update({ is_archived: true })
        .eq('id', notificationId) as any);

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast({
        title: 'Notification archived',
      });
    } catch (error) {
      console.error('Error archiving notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    } else if (notification.order_id) {
      navigate(`/orders`);
      setIsOpen(false);
    }
  };

  if (!user) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500 text-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 sm:w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm mt-1">We'll notify you when something happens!</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => {
                const IconComponent = typeIcons[notification.type] || Bell;
                const colorClass = typeColors[notification.type] || typeColors.general;

                return (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors ${
                      !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-full shrink-0 ${colorClass}`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notification.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1 shrink-0">
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveNotification(notification.id);
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-sm"
                onClick={() => {
                  navigate('/settings/notifications');
                  setIsOpen(false);
                }}
              >
                Notification Settings
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
