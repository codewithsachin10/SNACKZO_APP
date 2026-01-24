import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Razorpay from "npm:razorpay@2.9.2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { amount, currency = "INR", method, saved_card_token } = await req.json();

        const key_id = Deno.env.get('RAZORPAY_KEY_ID');
        const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET');

        if (!key_id || !key_secret) {
            console.error("Missing Razorpay Keys");
            return new Response(JSON.stringify({ error: "Server misconfiguration: Missing Payment Keys" }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500,
            });
        }

        // Initialize Razorpay
        const razorpay = new Razorpay({
            key_id: key_id,
            key_secret: key_secret,
        });

        const options: any = {
            amount: Math.round(amount * 100), // Ensure integer (paise)
            currency,
            receipt: `receipt_${Date.now().toString().slice(-10)}`,
            payment_capture: 1
        };

        // Add method-specific options
        if (method === 'card' && saved_card_token) {
            // For saved card payments, we'll handle it in the payment creation
            options.notes = { saved_card: 'true', token: saved_card_token };
        }

        console.log("Creating Razorpay Order:", options);

        const order = await razorpay.orders.create(options);

        console.log("Order Created:", order);

        return new Response(JSON.stringify(order), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: any) {
        console.error("Razorpay Error:", error);
        return new Response(JSON.stringify({ 
            error: error.message || "Payment initialization failed", 
            details: error.description || error.error?.description 
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
