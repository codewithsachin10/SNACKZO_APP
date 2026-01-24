/**
 * Process payment with saved card token
 * This function handles one-click checkout using saved card tokens
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Razorpay from "npm:razorpay@2.9.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { order_id, card_token, amount } = await req.json();

    const key_id = Deno.env.get('RAZORPAY_KEY_ID');
    const key_secret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!key_id || !key_secret) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: Missing Payment Keys" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });

    // Create payment with saved card token
    const payment = await razorpay.payments.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      order_id: order_id,
      method: 'card',
      card: {
        token: card_token
      },
      save: false, // Don't save again, already saved
      notes: {
        source: 'one_click_checkout'
      }
    });

    return new Response(JSON.stringify(payment), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error("Saved card payment error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Payment processing failed",
        details: error.description || error.error?.description
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
