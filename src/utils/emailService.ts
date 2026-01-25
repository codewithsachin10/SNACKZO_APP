import emailjs from "@emailjs/browser";
import { toast } from "sonner";

// EmailJS Configuration (Set these in .env)
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "service_default";
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const ORDER_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;

export const initEmailService = () => {
    if (PUBLIC_KEY) {
        emailjs.init(PUBLIC_KEY);
    } else {
        console.warn("EmailJS Public Key missing in .env");
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
