import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-resend-api-key",
};

interface EmailRequest {
    to: string | string[];
    subject: string;
    html: string;
    message?: string; // Support legacy simplified message
    from?: string;
}

const handler = async (req: Request): Promise<Response> => {
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { to, subject, html, message, from } = await req.json() as EmailRequest;

        // 1. Try to get key from Supabase Secrets (Best Practice)
        let resendKey = Deno.env.get("RESEND_API_KEY") || Deno.env.get("VITE_RESEND_API_KEY");

        // 2. If not found, check if client passed it (Temporary fix for Vercel/Client migrations)
        if (!resendKey) {
            resendKey = req.headers.get("x-resend-api-key") || "";
        }

        if (!resendKey) {
            throw new Error("Missing RESEND_API_KEY. Please set it in Supabase Secrets or pass it in x-resend-api-key header.");
        }

        // Adapt content
        const emailHtml = html || `<div>${message}</div>`;

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${resendKey}`,
            },
            body: JSON.stringify({
                from: from || "Snackzo <onboarding@resend.dev>",
                to: Array.isArray(to) ? to : [to],
                subject,
                html: emailHtml,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("Resend API Error:", data);
            return new Response(JSON.stringify(data), {
                status: res.status,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("Edge Function Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
};

serve(handler);
