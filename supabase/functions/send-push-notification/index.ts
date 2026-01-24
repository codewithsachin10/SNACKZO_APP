import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { Buffer } from "node:buffer";
import process from "node:process";

// Polyfill Node environments for web-push
globalThis.Buffer = Buffer;
globalThis.process = process;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  url?: string;
  orderId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com';

    // Configure WebPush
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, title, body, url, orderId } = await req.json() as PushNotificationRequest;

    console.log(`Processing push for User ${userId}`);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found.');
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({ title, body, url, orderId });
    const results = [];

    for (const sub of subscriptions) {
      // Construct the subscription object format required by web-push
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        results.push({ endpoint: sub.endpoint, status: 'sent' });
      } catch (err: any) {
        console.error(`Failed to send to ${sub.endpoint}:`, err);

        // Handle Expired Subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Removing expired subscription: ${sub.id}`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          results.push({ endpoint: sub.endpoint, status: 'expired_removed' });
        } else {
          results.push({ endpoint: sub.endpoint, status: 'failed', error: err.message });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Edge Function Error:', err);
    return new Response(
      JSON.stringify({ error: err.message, stack: err.stack }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
