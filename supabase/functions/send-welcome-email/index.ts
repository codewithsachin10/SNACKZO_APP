import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const handler = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
            },
        });
    }

    try {
        const { record } = await req.json();
        const email = record.email || "student@college.edu"; // Fallback/Test
        const name = record.raw_user_meta_data?.full_name || "Night Owl";

        if (!RESEND_API_KEY) {
            console.error("Missing RESEND_API_KEY");
            return new Response("Missing API Key", { status: 500 });
        }

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: "Hostel Mart <onboarding@resend.dev>", // Change to your verified domain later
                to: [email],
                subject: "Welcome to the Late Night Squad! 🌙",
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #6d28d9;">Welcome to Hostel Mart! 🛒</h1>
            <p>Hey ${name},</p>
            <p>Thanks for joining the revolution in late-night snacking. We're here to save you from hunger pangs during those 2AM study sessions (or gaming marathons).</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>🚀 What you can do:</h3>
              <ul>
                <li>Order snacks instantly to your room</li>
                <li>Get stationery delivered before exams</li>
                <li>Earn loyalty points with every order</li>
              </ul>
            </div>

            <p style="text-align: center;">
              <a href="https://hostel-hustle.vercel.app" style="background-color: #84cc16; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Order Now</a>
            </p>
            
            <p>Happy Snacking,<br/>The Hostel Mart Team</p>
          </div>
        `,
            }),
        });

        const data = await res.json();
        console.log("Email sent:", data);

        return new Response(JSON.stringify(data), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("Error sending welcome email:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
        });
    }
};

serve(handler);
