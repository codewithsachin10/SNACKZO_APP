import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sms-api-key",
};

interface SMSRequest {
    to: string;
    message: string;
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { to, message }: SMSRequest = await req.json();
        const apiKey = req.headers.get("x-sms-api-key") || Deno.env.get("FAST2SMS_API_KEY");

        if (!apiKey) {
            throw new Error("Missing SMS API Key");
        }

        console.log(`Sending SMS to ${to}: ${message}`);

        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
                "authorization": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                "route": "q",
                "sender_id": "TXTIND",
                "message": message,
                "numbers": to,
            }),
        });

        const data = await response.json();

        if (!data.return) {
            console.error("Fast2SMS Error:", data);
            throw new Error(data.message || "Provider Error");
        }

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
