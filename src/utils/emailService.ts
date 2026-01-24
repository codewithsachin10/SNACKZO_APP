import emailjs from "@emailjs/browser";
import { toast } from "sonner";

// KEYS FROM YOUR EMAILJS DASHBOARD
// You need to fill these in!
const SERVICE_ID = "service_ezycm0p"; // Found this in your screenshot tab title! ✅
const PUBLIC_KEY = "YOUR_PUBLIC_KEY_HERE"; // Go to Account -> Public Key
const ORDER_TEMPLATE_ID = "template_xxxxxxx"; // Create a new template for orders!

export const initEmailService = () => {
    if (PUBLIC_KEY && PUBLIC_KEY !== "YOUR_PUBLIC_KEY_HERE") {
        emailjs.init(PUBLIC_KEY);
    }
};

export const checkEmailConfig = () => {
    const isPublicSet = PUBLIC_KEY && PUBLIC_KEY !== "YOUR_PUBLIC_KEY_HERE";
    const isTemplateSet = ORDER_TEMPLATE_ID && ORDER_TEMPLATE_ID !== "template_xxxxxxx";

    return {
        configured: isPublicSet && isTemplateSet,
        missing: [
            !isPublicSet ? "Public Key" : null,
            !isTemplateSet ? "Template ID" : null
        ].filter(Boolean)
    };
};

export const sendOrderEmail = async (
    toName: string,
    toEmail: string,
    type: "confirmed" | "delivered",
    data: { orderId: string; amount: string; link: string }
) => {
    if (PUBLIC_KEY === "YOUR_PUBLIC_KEY_HERE") {
        console.warn("⚠️ EmailJS Public Key not set. Email not sent.");
        return;
    }

    try {
        const templateParams = {
            to_name: toName,
            to_email: toEmail, // Ensure your template has an "Email To" field mapped to this!
            message_type: type === "confirmed" ? "Order Confirmed ✅" : "Order Delivered 🚀",
            order_id: data.orderId,
            amount: data.amount,
            action_link: data.link,
            message_body: type === "confirmed"
                ? "Your order has been placed successfully! We are packing it now."
                : "Your order has been delivered! You can download your receipt below."
        };

        const response = await emailjs.send(
            SERVICE_ID,
            ORDER_TEMPLATE_ID,
            templateParams
        );

        console.log("SUCCESS!", response.status, response.text);
        if (type === "delivered") toast.success("Receipt emailed to customer!");
    } catch (err) {
        console.error("FAILED...", err);
        // Don't show error toast to user for background emails to avoid confusion
    }
};
