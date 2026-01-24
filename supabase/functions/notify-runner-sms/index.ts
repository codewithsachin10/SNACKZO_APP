import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SMSRequest {
  orderId: string;
  runnerId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-runner-sms function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, runnerId }: SMSRequest = await req.json();

    console.log(`Processing SMS notification for runner ${runnerId}, order ${orderId}`);

    if (!orderId || !runnerId) {
      throw new Error("orderId and runnerId are required");
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error("Twilio credentials not configured");
      return new Response(JSON.stringify({ success: false, error: "SMS not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get runner info
    const { data: runner, error: runnerError } = await supabase
      .from("runners")
      .select("name, phone")
      .eq("id", runnerId)
      .single();

    if (runnerError || !runner) {
      console.error("Failed to fetch runner:", runnerError);
      throw new Error("Runner not found");
    }

    // Get order info
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, delivery_address, total, payment_method")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("Failed to fetch order:", orderError);
      throw new Error("Order not found");
    }

    const message = `🛒 New Order Assigned!\n\nOrder #${orderId.slice(0, 8).toUpperCase()}\nAddress: ${order.delivery_address}\nTotal: ₹${order.total}\nPayment: ${order.payment_method === 'cod' ? 'Cash on Delivery' : 'Prepaid'}\n\nLogin to your Runner Dashboard to view details.`;

    console.log(`Sending SMS to ${runner.phone}`);

    // Format phone number (add country code if not present)
    let toPhone = runner.phone.replace(/\s/g, '');
    if (!toPhone.startsWith('+')) {
      toPhone = '+91' + toPhone; // Assuming India
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: toPhone,
        From: TWILIO_PHONE_NUMBER!,
        Body: message,
      }),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioResult);
      throw new Error(twilioResult.message || "Failed to send SMS");
    }

    console.log("SMS sent successfully:", twilioResult.sid);

    return new Response(JSON.stringify({ success: true, messageSid: twilioResult.sid }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in notify-runner-sms function:", error);
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
