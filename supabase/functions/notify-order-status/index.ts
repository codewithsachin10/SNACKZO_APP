import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  orderId: string;
  newStatus: string;
  userEmail?: string;
}

const statusMessages: Record<string, { subject: string; message: string }> = {
  placed: {
    subject: "Order Confirmed! 🎉",
    message: "Your order has been placed successfully and is being prepared.",
  },
  packed: {
    subject: "Order Packed! 📦",
    message: "Great news! Your order has been packed and is ready for delivery.",
  },
  out_for_delivery: {
    subject: "Order on the Way! 🚴",
    message: "Your order is out for delivery. Our runner is on the way!",
  },
  delivered: {
    subject: "Order Delivered! ✅",
    message: "Your order has been delivered. Enjoy your snacks!",
  },
  cancelled: {
    subject: "Order Cancelled",
    message: "Your order has been cancelled. If you have questions, please contact us.",
  },
};

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-order-status function called");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, newStatus, userEmail }: NotificationRequest = await req.json();
    
    console.log(`Processing notification for order ${orderId}, status: ${newStatus}`);

    if (!orderId || !newStatus) {
      throw new Error("orderId and newStatus are required");
    }

    // Get status message
    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) {
      console.log(`Unknown status: ${newStatus}, skipping notification`);
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no email provided, try to get from database
    let email = userEmail;
    if (!email) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get order and user email
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("user_id")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        console.error("Failed to fetch order:", orderError);
        throw new Error("Order not found");
      }

      // Get user email from auth
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(order.user_id);
      
      if (userError || !userData.user?.email) {
        console.log("Could not get user email, skipping notification");
        return new Response(JSON.stringify({ success: true, skipped: true, reason: "no email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      email = userData.user.email;
    }

    console.log(`Sending email to ${email}`);

    // Send email notification via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Hostel Mart <onboarding@resend.dev>",
        to: [email],
        subject: `Hostel Mart - ${statusInfo.subject}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
            <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(145deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 32px; border: 1px solid #2d2d4a;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="font-size: 24px; margin: 0; background: linear-gradient(135deg, #a855f7, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                  🛒 Hostel Mart
                </h1>
              </div>
              
              <div style="text-align: center; padding: 24px; background: rgba(168, 85, 247, 0.1); border-radius: 12px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #ffffff;">${statusInfo.subject}</h2>
                <p style="margin: 0; color: #a1a1aa; font-size: 14px;">${statusInfo.message}</p>
              </div>
              
              <div style="padding: 16px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 1px;">Order ID</p>
                <p style="margin: 0; font-size: 16px; font-weight: bold; color: #ffffff;">#${orderId.slice(0, 8).toUpperCase()}</p>
              </div>
              
              <div style="text-align: center; padding-top: 16px; border-top: 1px solid #2d2d4a;">
                <p style="margin: 0; font-size: 12px; color: #71717a;">
                  Late night cravings? We've got you covered! 🌙
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const emailResult = await emailResponse.json();

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in notify-order-status function:", error);
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