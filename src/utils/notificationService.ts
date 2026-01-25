import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * UNIFIED NOTIFICATION SERVICE
 * Handles Email (Resend), SMS (Fast2SMS/Twilio), and WhatsApp (Twilio).
 * 
 * Architecture:
 * Frontend -> Supabase Edge Function ('send-notification') -> 3rd Party APIs
 * This keeps your API Keys secure on the server.
 */

interface NotificationPayload {
    to: string; // Email or Phone
    subject?: string; // For Email
    message?: string; // For SMS/WhatsApp
    html?: string; // For Email
    data?: any; // Dynamic data for templates
}

export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export const sendNotification = async (
    channel: NotificationChannel,
    payload: NotificationPayload
) => {
    console.log(`[Notification] Sending ${channel} to ${payload.to}...`);

    try {
        const apiBase = window.location.hostname === 'localhost' ? 'https://snackzo.tech' : '';
        // Call Vercel Serverless Function (/api/notify)
        const response = await fetch(`${apiBase}/api/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channel,
                ...payload
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`[Notification] ${channel} Failed:`, data);
            if (import.meta.env.DEV) {
                toast.info(`[Dev] API call failed. Ensure local server running or check logs.`);
            }
            return false;
        }

        console.log(`[Notification] ${channel} Sent!`, data);
        return true;

    } catch (err) {
        console.error(`[Notification] Network Error:`, err);
        return false;
    }
};

// Convenience Methods

export const notifyOrderConfirmed = async (email: string, phone: string, orderDetails: any) => {
    // 1. Send Email (Resend)
    if (email) {
        await sendNotification('email', {
            to: email,
            subject: `Order Confirmed #${orderDetails.id.slice(0, 6)}`,
            html: `<h1>Order Confirmed!</h1><p>Your food is being prepared.</p><p>Total: ₹${orderDetails.total}</p>`
        });
    }

    // 2. Send WhatsApp (Twilio)
    if (phone) {
        await sendNotification('whatsapp', {
            to: phone,
            message: ` *Snackzo Order Confirmed* \nOrder #${orderDetails.id.slice(0, 6)} is confirmed! We are preparing your food. 🍔`
        });
    }
};

export const notifyOrderOutForDelivery = async (phone: string, runnerName: string) => {
    // SMS Priority for delivery updates
    await sendNotification('sms', {
        to: phone,
        message: `Snackzo: Your order is Out for Delivery! ${runnerName} is on the way. 🛵`
    });
};
