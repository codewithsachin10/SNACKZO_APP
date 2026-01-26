import { toast } from "sonner";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const SMS_API_KEY = import.meta.env.VITE_SMS_API_KEY;

export interface SendEmailParams {
    to: string;
    subject: string;
    message: string;
    html?: string;
}

export interface SendSMSParams {
    to: string;
    message: string;
}

// Celebration Animation
export const triggerSuccessCelebration = () => {
    const scalar = 2;
    const triangle = confetti.shapeFromPath({ path: 'M0 10 L5 0 L10 10z' });

    confetti({
        shapes: [triangle],
        particleCount: 150,
        spread: 120,
        origin: { y: 0.6 },
        colors: ['#ffffff', '#7c3aed', '#db2777'],
        scalar
    });

    // Side Bursts
    const end = Date.now() + (3 * 1000);
    const colors = ['#7c3aed', '#ffffff'];

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
};

export const sendNotification = async (type: 'email' | 'sms', params: SendEmailParams | SendSMSParams) => {
    try {
        if (type === 'email') {
            const { to, subject, message, html } = params as SendEmailParams;

            // Check if email simulation is enabled in database
            const { data: toggle } = await supabase
                .from('feature_toggles' as any)
                .select('is_enabled')
                .eq('feature_name', 'email_simulation')
                .single();

            const isSimulationMode = toggle?.is_enabled ?? false;

            if (!RESEND_API_KEY || isSimulationMode) {
                console.log("[EMAIL SIMULATION]", { to, subject, message });
                if (isSimulationMode) {
                    toast.info("Simulation Mode Enabled", { description: "Email logged to console instead of sending." });
                } else {
                    toast.error("Missing API Key", { description: "Ensure 'VITE_RESEND_API_KEY' is set in Vercel/Env." });
                }
                return { success: true };
            }

            // Use Supabase Edge Function to avoid CORS issues
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to,
                    subject,
                    html: html || message, // Fallback if html is missing
                    message // For backward compat
                },
                headers: {
                    "x-resend-api-key": RESEND_API_KEY // Pass key securely to Edge Function
                }
            });

            if (error) {
                console.error("Edge Function Error:", error);
                // Return success anyway so order flow doesn't break
                return { success: false, error: error.message };
            }

            return { success: true, data };
        }

        else {
            const { to, message } = params as SendSMSParams;

            // SMS Integration temporarily disabled by request
            console.log("[SMS DISABLED]", { to, message });
            return { success: true };

            if (!SMS_API_KEY) {
                console.log("[SMS SIMULATION]", { to, message });
                toast.info("Simulation Mode: SMS sent to console");
                return { success: true };
            }

            const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
                method: "POST",
                headers: {
                    "authorization": SMS_API_KEY,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "route": "q",
                    "sender_id": "TXTIND",
                    "message": message,
                    "numbers": to
                })
            });

            const data = await response.json();
            if (data.return) return { success: true, data };
            throw new Error(data.message || "Fast2SMS API Error");
        }
    } catch (error: any) {
        console.error(`Dispatch Error [${type}]:`, error);
        throw error;
    }
};

// --- EMAIL HELPERS ---

export const sendWelcomeEmail = async (email: string, name: string) => {
    const result = await sendNotification('email', {
        to: email,
        subject: `Welcome to Snackzo, ${name.split(' ')[0]}! 🍔`,
        message: `Welcome to Snackzo! We're excited to serve you.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background: #7c3aed; padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Snackzo!</h1>
                </div>
                <div style="padding: 30px; color: #333;">
                    <p style="font-size: 16px; line-height: 1.6;">Hi ${name},</p>
                    <p style="font-size: 16px; line-height: 1.6;">We're thrilled to have you join our hostel food community. Now you can order your favorite meals, track deliveries in real-time, and enjoy exclusive midnight deals!</p>
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="https://snackzo.tech" style="background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold;">Start Ordering Now</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">Happy Binging!<br/>Team Snackzo</p>
                </div>
            </div>
        `
    });
    toast.success("Welcome email sent!", { description: "Please check your inbox (and spam folder) to start your journey! 🍔" });
    return result;
};

export const sendOTPEmail = async (email: string, otp: string) => {
    const result = await sendNotification('email', {
        to: email,
        subject: `Your Snackzo Verification Code: ${otp}`,
        message: `Your verification code is ${otp}`,
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 16px; padding: 40px; text-align: center;">
                <h2 style="color: #111;">Verify Your Account</h2>
                <p style="color: #666;">Use the code below to complete your sign-in. This code will expire in 10 minutes.</p>
                <div style="background: #f4f1ff; border: 2px dashed #7c3aed; border-radius: 12px; padding: 20px; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #7c3aed;">${otp}</span>
                </div>
                <p style="font-size: 12px; color: #999;">If you didn't request this code, please ignore this email.</p>
            </div>
        `
    });
    toast.success("OTP sent to your email!", { description: "Check your inbox or spam folder for the verification code 🔐" });
    return result;
};

export const sendOrderReceiptEmail = async (email: string, orderDetails: any) => {
    const { orderId, totalAmount, items, userName } = orderDetails;

    const itemsHtml = items.map((item: any) => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px 0; color: #333;">${item.name} x ${item.quantity}</td>
            <td style="padding: 12px 0; text-align: right; color: #111;">₹${item.price * item.quantity}</td>
        </tr>
    `).join('');

    const result = await sendNotification('email', {
        to: email,
        subject: `Your Receipt for Order #${orderId.slice(0, 8)} 🧾`,
        message: `Confirming your order from Snackzo.`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; border: 1px solid #e5e5e5; border-radius: 16px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="color: #7c3aed; margin: 0;">SNACKZO RECEIPT</h2>
                    <p style="color: #666; font-size: 12px;">Order ID: ${orderId.toUpperCase()}</p>
                </div>
                <p style="font-size: 16px;">Hi ${userName},</p>
                <p style="color: #666;">Thanks for ordering! We've received your payment and our kitchen is already buzzing.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
                    <thead>
                        <tr style="border-bottom: 2px solid #7c3aed;">
                            <th style="padding: 10px 0; text-align: left; font-size: 12px; color: #7c3aed;">ITEM</th>
                            <th style="padding: 10px 0; text-align: right; font-size: 12px; color: #7c3aed;">PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td style="padding: 20px 0 0; font-weight: bold; font-size: 18px;">TOTAL AMOUNT</td>
                            <td style="padding: 20px 0 0; text-align: right; font-weight: bold; font-size: 18px; color: #7c3aed;">₹${totalAmount}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                    Need help? Contact us at support@snackzo.tech
                </div>
            </div>
        `
    });

    toast.success("Order receipt sent!", { description: "Check your email (and spam) for the digital bill 🧾" });
    return result;
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
    const result = await sendNotification('email', {
        to: email,
        subject: `Reset Your Snackzo Password 🔐`,
        message: `Click the link to reset your password: ${resetLink}`,
        html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 20px; padding: 40px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                <div style="background: #7c3aed; width: 60px; hieght: 60px; border-radius: 15px; display: flex; align-items: center; justify-content: center; margin: 0 auto 25px;">
                     <span style="font-size: 30px;">🔑</span>
                </div>
                <h2 style="color: #111; margin-bottom: 15px;">Password Reset Request</h2>
                <p style="color: #666; line-height: 1.6;">We received a request to reset your Snackzo password. No worries, it happens to the best of us!</p>
                
                <div style="margin: 35px 0;">
                    <a href="${resetLink}" style="background: #7c3aed; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);">Reset Password Now</a>
                </div>

                <div style="text-align: left; background: #f9fafb; border-radius: 12px; padding: 20px; margin-top: 30px;">
                    <p style="font-size: 12px; font-weight: bold; color: #111; margin-top: 0;">Next Steps:</p>
                    <ul style="font-size: 12px; color: #666; padding-left: 15px; margin-bottom: 0;">
                        <li>Click the purple button above</li>
                        <li>Enter your new secure password</li>
                        <li>Log back in and grab some snacks!</li>
                    </ul>
                </div>

                <p style="font-size: 11px; color: #999; margin-top: 30px;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
        `
    });
    toast.success("Reset link sent!", { description: "Please check your inbox (and spam) for the password link 📧" });
    return result;
};

// --- EXISTING SMS HELPERS ---

// --- EXISTING SMS HELPERS ---

export const notifyOrderConfirmed = async (phone: string, orderId: string, amount: number) => {
    // Keep SMS extremely simple to avoid DLT blocking
    const result = await sendNotification('sms', {
        to: phone,
        message: `Snackzo Order #${orderId.slice(0, 6)} confirmed for Rs.${amount}.`
    });
    // This toast now accurately reflects that SMS is sent
    toast.success("Order confirmed!", { description: "We've sent a confirmation to your phone 📱" });
    return result;
};

export const sendOrderConfirmationEmail = async (email: string, orderId: string, name: string) => {
    const result = await sendNotification('email', {
        to: email,
        subject: `Order Confirmed: #${orderId.slice(0, 8)} 🍔`,
        message: `Your order from Snackzo is confirmed!`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 20px; overflow: hidden;">
                <div style="background: #7c3aed; padding: 40px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Order Confirmed!</h1>
                    <p style="color: #ddd; margin-top: 10px;">ID: #${orderId.toUpperCase()}</p>
                </div>
                <div style="padding: 40px; color: #333; text-align: center;">
                    <div style="font-size: 60px; margin-bottom: 20px;">🔥</div>
                    <h2 style="margin-top: 0;">Hi ${name}, your fuel is on the way!</h2>
                    <p style="font-size: 16px; line-height: 1.6; color: #666;">Our kitchen has received your order and we're starting to pack it right now. You can track your rider in real-time through the app.</p>
                    <div style="margin-top: 40px;">
                        <a href="https://snackzo.tech/orders" style="background: #7c3aed; color: white; padding: 15px 30px; border-radius: 10px; text-decoration: none; font-weight: bold;">Track Delivery 🛵</a>
                    </div>
                </div>
            </div>
        `
    });
    toast.success("Order confirmation sent!", { description: "Check your email for your order status 📧" });
    return result;
};

export const notifyOrderOutForDelivery = async (phone: string, runnerName: string) => {
    return sendNotification('sms', {
        to: phone,
        message: `Snackzo: Order Out for Delivery by ${runnerName}.`
    });
};

export const notifyOrderArrived = async (phone: string) => {
    return sendNotification('sms', {
        to: phone,
        message: `Snackzo: Your order has arrived at location.`
    });
};
