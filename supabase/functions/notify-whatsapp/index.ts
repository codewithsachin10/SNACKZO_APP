import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER") || "whatsapp:+14155238886"; // Twilio sandbox default

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  type: "runner_assignment" | "order_status";
  orderId: string;
  runnerId?: string;
  userId?: string;
  newStatus?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-whatsapp function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: WhatsAppRequest = await req.json();
    const { type, orderId, runnerId, userId, newStatus } = requestData;

    console.log(`Processing WhatsApp notification: type=${type}, orderId=${orderId}`);

    if (!orderId) {
      throw new Error("orderId is required");
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      console.error("Twilio credentials not configured");
      return new Response(JSON.stringify({ success: false, error: "WhatsApp not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get order info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, delivery_address, total, payment_method, status, user_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Failed to fetch order:", orderError);
      throw new Error("Order not found");
    }

    let toPhone: string;
    let message: string;

    if (type === "runner_assignment" && runnerId) {
      // Get runner info
      const { data: runner, error: runnerError } = await supabase
        .from("runners")
        .select("name, phone, notification_preference")
        .eq("id", runnerId)
        .single();

      if (runnerError || !runner) {
        console.error("Failed to fetch runner:", runnerError);
        throw new Error("Runner not found");
      }

      // Check if runner prefers WhatsApp
      if (runner.notification_preference !== 'whatsapp' && runner.notification_preference !== 'both') {
        console.log("Runner doesn't prefer WhatsApp, skipping");
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "Runner prefers SMS" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      toPhone = runner.phone;
      message = `🛒 *New Order Assigned!*\n\n` +
        `*Order:* #${orderId.slice(0, 8).toUpperCase()}\n` +
        `*Address:* ${order.delivery_address}\n` +
        `*Total:* ₹${order.total}\n` +
        `*Payment:* ${order.payment_method === 'cod' ? 'Cash on Delivery 💵' : 'Prepaid ✅'}\n\n` +
        `Login to your Runner Dashboard to view details.`;

    } else if (type === "order_status" && userId) {
      // Get customer profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, phone, notification_preference")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile || !profile.phone) {
        console.error("Failed to fetch profile or no phone:", profileError);
        return new Response(JSON.stringify({ success: false, error: "Customer phone not found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if customer prefers WhatsApp
      if (profile.notification_preference !== 'whatsapp' && profile.notification_preference !== 'both') {
        console.log("Customer doesn't prefer WhatsApp, skipping");
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "Customer prefers push" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      toPhone = profile.phone;
      
      const statusEmojis: Record<string, string> = {
        placed: "📦",
        packed: "📦✅",
        out_for_delivery: "🚀",
        delivered: "✅🎉",
        cancelled: "❌"
      };
      
      const statusMessages: Record<string, string> = {
        placed: "Your order has been placed!",
        packed: "Your order is packed and ready!",
        out_for_delivery: "Your order is out for delivery!",
        delivered: "Your order has been delivered!",
        cancelled: "Your order has been cancelled."
      };

      const status = newStatus || order.status;
      message = `${statusEmojis[status] || "📋"} *Order Update*\n\n` +
        `*Order:* #${orderId.slice(0, 8).toUpperCase()}\n` +
        `*Status:* ${statusMessages[status] || status}\n\n` +
        `Thank you for ordering with Hostel Mart! 🛍️`;

    } else {
      throw new Error("Invalid request type or missing parameters");
    }

    // Format phone number for WhatsApp
    let formattedPhone = toPhone.replace(/\s/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone;
    }
    const whatsappTo = `whatsapp:${formattedPhone}`;

    console.log(`Sending WhatsApp to ${whatsappTo}`);

    // Send WhatsApp via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: whatsappTo,
        From: TWILIO_WHATSAPP_NUMBER,
        Body: message,
      }),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio WhatsApp error:", twilioResult);
      throw new Error(twilioResult.message || "Failed to send WhatsApp message");
    }

    console.log("WhatsApp message sent successfully:", twilioResult.sid);

    return new Response(JSON.stringify({ success: true, messageSid: twilioResult.sid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in notify-whatsapp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
