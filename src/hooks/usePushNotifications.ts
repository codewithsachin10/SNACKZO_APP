import { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Helper to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();

  useEffect(() => {
    // Avoid registering service workers in local dev.
    // Stale SWs are a common cause of fetch/WebSocket requests hanging.
    if (!import.meta.env.PROD) return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker Registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker Registration Failed:', error);
      });
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error("This browser does not support notifications.");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      toast.success("Notifications enabled!");

      // Attempt to subscribe to Push Manager
      await subscribeToPush();

      return true;
    } else {
      toast.error("Notifications denied.");
      return false;
    }
  };

  const subscribeToPush = async () => {
    try {
      if (!user) return; // Must be logged in

      const registration = await navigator.serviceWorker.ready;

      // Check if VAPID key is set
      // NOTE: User must set VITE_VAPID_PUBLIC_KEY in .env
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        console.warn("VITE_VAPID_PUBLIC_KEY not found. Skip push subscription.");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Save subscription to Supabase
      // Format: { endpoint, keys: { p256dh, auth } }
      // Our table expects: user_id, endpoint, p256dh, auth
      const subJson = subscription.toJSON();

      if (subJson.keys) {
        const { error } = await supabase.from('push_subscriptions').upsert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh: subJson.keys.p256dh,
          auth: subJson.keys.auth
        }, { onConflict: 'endpoint' });

        if (error) {
          console.error("Failed to save push subscription:", error);
        } else {
          console.log("Push subscription saved.");
        }
      }

    } catch (error) {
      console.error("Failed to subscribe to push:", error);
      // Don't toast error to user to avoid annoyance, just log
    }
  };

  const showLocalNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body,
          icon: '/favicon.ico',
          vibrate: [200, 100, 200]
        } as any);
      });
    }
  };

  return { requestPermission, showLocalNotification };
};
