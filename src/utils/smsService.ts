import { toast } from "sonner";

// Uses Fast2SMS (India) or can be adapted for Twilio (requires backend)
const SMS_API_KEY = import.meta.env.VITE_SMS_API_KEY;

export const sendSMS = async (phone: string, message: string) => {
    // 1. Validation
    if (!phone || phone.length < 10) return;

    // 2. Simulation Mode (if no key provided)
    if (!SMS_API_KEY) {
        console.log(`[SMS SIMULATION] To: ${phone} | Msg: ${message}`);
        // Only show toast in Dev mode to avoid clutter
        if (import.meta.env.DEV) {
            toast.info(`📱 SMS Simulator: "${message}" sent to ${phone}`);
        }
        return;
    }

    // 3. Real Sending (Fast2SMS Example - Common in India)
    try {
        const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
                "authorization": SMS_API_KEY,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "route": "v3", // or 'q' for quick
                "sender_id": "TXTIND",
                "message": message,
                "language": "english",
                "flash": 0,
                "numbers": phone
            })
        });

        const data = await response.json();
        if (data.return) {
            console.log("✅ SMS Sent Successfully", data);
        } else {
            console.warn("❌ SMS Provider Error:", data);
        }
    } catch (err) {
        console.error("❌ SMS Network Error:", err);
    }
};

// Types of SMS notifications
export const notifyOrderPlaced = (phone: string, orderId: string, amount: number) => {
    sendSMS(phone, `Snackzo: Order #${orderId.slice(0, 6)} confirmed for Rs.${amount}. We are packing it now! 🍔`);
};

export const notifyOrderOutForDelivery = (phone: string, runnerName: string) => {
    sendSMS(phone, `Snackzo: Your order is Out for Delivery! ${runnerName} is on the way. 🛵`);
};

export const notifyOrderArrived = (phone: string) => {
    sendSMS(phone, `Snackzo: Your food has arrived! Please collect it from the runner. 📍`);
};
