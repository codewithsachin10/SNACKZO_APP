import { toast } from "sonner";
import confetti from "canvas-confetti";

const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY;
const SMS_API_KEY = import.meta.env.VITE_SMS_API_KEY;

export interface SendEmailParams {
    to: string;
    subject: string;
    message: string;
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
            const { to, subject, message } = params as SendEmailParams;

            if (!RESEND_API_KEY || RESEND_API_KEY === 're_...') {
                // Simulation Mode
                console.log("[EMAIL SIMULATION]", { to, subject, message });
                toast.info("Simulation Mode: Email sent to console");
                return { success: true };
            }

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: 'Snackzo <onboarding@resend.dev>', // Default Resend test email
                    to: [to],
                    subject: subject,
                    html: `<div style="font-family: sans-serif; padding: 20px; color: #111;">
                            <h2 style="color: #7c3aed;">Message from Snackzo</h2>
                            <p>${message}</p>
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                            <small style="color: #666;">This is an automated operational dispatch from your hostel food partner.</small>
                           </div>`
                })
            });

            const data = await response.json();
            if (response.ok) return { success: true, data };
            throw new Error(data.message || "Resend API Error");
        }

        else {
            const { to, message } = params as SendSMSParams;

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
                    "language": "english",
                    "flash": 0,
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
// Helper Wrappers for System Events
export const notifyOrderConfirmed = async (phone: string, orderId: string, amount: number) => {
    return sendNotification('sms', {
        to: phone,
        message: `Snackzo: Order #${orderId.slice(0, 6)} confirmed for Rs.${amount}. We are packing it now! 🍔`
    });
};

export const notifyOrderOutForDelivery = async (phone: string, runnerName: string) => {
    return sendNotification('sms', {
        to: phone,
        message: `Snackzo: Your order is Out for Delivery! ${runnerName} is on the way. 🛵`
    });
};

export const notifyOrderArrived = async (phone: string) => {
    return sendNotification('sms', {
        to: phone,
        message: `Snackzo: Your food has arrived! Please collect it from the runner. 📍`
    });
};
