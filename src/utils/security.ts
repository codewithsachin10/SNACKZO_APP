import { z } from "zod";

/**
 * SECURITY HARDENING UTILITIES
 * Implements strict input validation, sanitization, and throttling.
 */

// 1. Zod Schemas for Strict Input Validation
export const schemas = {
    // Login/Signup Validation
    auth: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        phone: z.string().min(10, "Phone number must be valid").regex(/^\+?[0-9]*$/, "Phone must be numeric"),
        fullName: z.string().min(2).max(100).regex(/^[a-zA-Z\s]*$/, "Name contains invalid characters")
    }),

    // Checkout/Order Validation
    order: z.object({
        notes: z.string().max(200, "Notes cannot exceed 200 characters").transform(val => sanitizeInput(val)),
        deliveryMode: z.enum(["room", "common_area"]),
        amount: z.number().positive("Amount must be positive")
    })
};

// 2. Input Sanitization (XSS Prevention)
// Removes potentially dangerous HTML tags
export const sanitizeInput = (input: string): string => {
    if (!input) return "";
    return input
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
        .replace(/<[^>]+>/g, "")
        .trim();
};

// 3. Client-Side Rate Limiting (Throttle)
// Prevents double-clicks or spamming buttons
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function (this: any, ...args: Parameters<T>) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
