
import React from 'react';

// --- Types ---
export interface EmailTemplateProps {
    type: 'order' | 'payment' | 'update';
    data: {
        orderId?: string;
        userName?: string;
        amount?: number;
        items?: { name: string; qty: number; price: number }[];
        date?: string;
        address?: string;
        message?: string; // For updates
        subject?: string; // For updates
        bannerUrl?: string;
        eta?: string;
        status?: string;
    };
    options?: {
        showSocial?: boolean;
        showFooter?: boolean;
        showQr?: boolean;
        themeColor?: string;
    };
}

// --- Shared Mock Data Helper for Previews ---
export const MOCK_DATA = {
    order: {
        orderId: "EF3D160A",
        date: "Jan 30, 2026",
        userName: "Sachin",
        items: [
            { name: "Spicy Lays (Family Pack)", qty: 2, price: 40 },
            { name: "Thums Up (500ml)", qty: 1, price: 45 },
            { name: "Snickers Bar", qty: 3, price: 60 }
        ],
        amount: 165,
        address: "Hostel Block A, Room 304",
        status: "Cooking"
    },
    payment: {
        orderId: "PAY-998877",
        date: "Jan 30, 2026",
        userName: "Sachin",
        amount: 165,
        items: [
            { name: "Order #EF3D160A", qty: 1, price: 165 }
        ],
        status: "Paid",
        bannerUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80"
    },
    update: {
        userName: "Sachin",
        subject: "Midnight Biryani Fest! 🍗",
        message: "Hey Fighters! Exams got you down? Turn that frown upside down with our Midnight Biryani Special. Order between 11 PM and 2 AM to get flat 20% OFF. Use code: NIGHTOWL.",
        bannerUrl: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80"
    }
};

// --- Helper for Styles ---
const fontFamilySans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';
const fontFamilySerif = 'Georgia, Times, "Times New Roman", serif';
const fontFamilyMono = '"Courier Prime", "Courier New", Courier, monospace';

// --- 1. Modern Minimalist (SaaS Style) ---
export const ModernMinimalist: React.FC<EmailTemplateProps> = ({ type, data, options }) => {
    const themeColor = options?.themeColor || '#2563eb';

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#ffffff', fontFamily: fontFamilySans, color: '#0f172a', margin: 0, padding: 0 }}>
            {data.bannerUrl && <img src={data.bannerUrl} alt="Banner" style={{ width: '100%', height: '192px', objectFit: 'cover', display: 'block' }} />}

            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#0f172a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px', lineHeight: '32px', textAlign: 'center' }}>S</div>
                    <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>Snackzo</h1>
                </div>
                <span style={{ padding: '4px 12px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
                    {type === 'update' ? 'Broadcast' : `#${data.orderId}`}
                </span>
            </div>

            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div style={{
                    width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 24px auto',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: options?.themeColor ? options.themeColor + '15' : '#eff6ff',
                    color: themeColor
                }}>
                    {/* SVG icons don't always render well in email, using a simple character or img is safer, but keeping SVG for now as some clients support it */}
                    <span style={{ fontSize: '32px', lineHeight: '64px' }}>✓</span>
                </div>

                <h2 style={{ fontSize: '30px', fontWeight: '800', color: '#0f172a', marginBottom: '12px', letterSpacing: '-0.025em', margin: '0 0 12px 0' }}>
                    {type === 'update' ? data.subject : "Order Confirmed"}
                </h2>
                <p style={{ color: '#64748b', fontSize: '18px', lineHeight: '1.625', maxWidth: '384px', margin: '0 auto' }}>
                    {type === 'update' ? data.message : `Thanks, ${data.userName}. We've received your order and are preparing it now.`}
                </p>

                {type !== 'update' && data.items && (
                    <div style={{ marginTop: '40px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9', padding: '24px', textAlign: 'left' }}>
                        <div style={{ width: '100%' }}>
                            {data.items.map((i, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', fontSize: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12px', fontWeight: '500', color: '#64748b', lineHeight: '24px', textAlign: 'center', marginRight: '12px' }}>{i.qty}</span>
                                        <span style={{ fontWeight: '500', color: '#334155' }}>{i.name}</span>
                                    </div>
                                    <span style={{ fontFamily: fontFamilyMono, color: '#475569' }}>₹{i.price}</span>
                                </div>
                            ))}
                            <div style={{ paddingTop: '16px', marginTop: '16px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Total Paid</span>
                                <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#0f172a' }}>₹{data.amount}</span>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ marginTop: '40px' }}>
                    <a href="#" style={{
                        display: 'inline-block',
                        textDecoration: 'none',
                        color: 'white',
                        padding: '14px 32px',
                        borderRadius: '12px',
                        fontWeight: '600',
                        fontSize: '14px',
                        backgroundColor: themeColor,
                        boxShadow: `0 10px 15px -3px ${themeColor}40`
                    }}>
                        {type === 'update' ? 'Read More' : 'Track Order Status'}
                    </a>
                </div>
            </div>

            {/* Optional Components */}
            {(options?.showSocial || options?.showFooter || options?.showQr) && (
                <div style={{ backgroundColor: '#f9fafb', padding: '24px', textAlign: 'center', color: '#9ca3af' }}>
                    {options.showSocial && (
                        <div style={{ marginBottom: '16px', fontSize: '14px' }}>
                            <span style={{ margin: '0 8px' }}>Instagram</span> • <span style={{ margin: '0 8px' }}>Twitter</span> • <span style={{ margin: '0 8px' }}>LinkedIn</span>
                        </div>
                    )}
                    {options.showQr && (
                        <div style={{ padding: '8px', display: 'inline-block', backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
                            <div style={{ width: '64px', height: '64px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '8px' }}>QR CODE</div>
                        </div>
                    )}
                    {options.showFooter && (
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>© 2026 Snackzo Inc. All rights reserved.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// --- 2. Corporate Fintech ---
export const CorporateFintech: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#f7f9fc', margin: '0 auto', fontFamily: fontFamilySans, color: '#333333', padding: '40px' }}>
        <div style={{ backgroundColor: '#ffffff', borderTop: '4px solid #2563eb', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
            {data.bannerUrl && <img src={data.bannerUrl} alt="Banner" style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />}
            <div style={{ padding: '32px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '18px' }}>Snackzo</span>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>{type === 'update' ? 'Official Update' : 'Receipt'}</span>
            </div>
            <div style={{ padding: '32px' }}>
                {type === 'update' ? (
                    <div>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px', margin: '0 0 16px 0' }}>{data.subject}</h2>
                        <p style={{ color: '#4b5563', lineHeight: '1.625', margin: 0 }}>{data.message}</p>
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: '32px' }}>
                            <p style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', margin: '0 0 4px 0' }}>Amount Paid</p>
                            <h1 style={{ fontSize: '36px', fontFamily: fontFamilyMono, marginTop: '4px', margin: 0 }}>₹{data.amount}.00</h1>
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <th style={{ textAlign: 'left', fontWeight: '500', padding: '8px 0', color: '#9ca3af', textTransform: 'uppercase', fontSize: '12px' }}>Description</th>
                                    <th style={{ textAlign: 'right', fontWeight: '500', padding: '8px 0', color: '#9ca3af', textTransform: 'uppercase', fontSize: '12px' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map((i, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                                        <td style={{ padding: '12px 0' }}>{i.name} x {i.qty}</td>
                                        <td style={{ padding: '12px 0', textAlign: 'right' }}>₹{i.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
                <div style={{ marginTop: '32px' }}>
                    <a href="#" style={{ color: '#2563eb', fontSize: '14px', textDecoration: 'none', cursor: 'pointer' }}>View in Dashboard ↗</a>
                </div>
            </div>
            <div style={{ backgroundColor: '#f9fafb', padding: '24px', fontSize: '12px', color: '#9ca3af' }}>
                Questions? Contact support@snackzo.tech
            </div>
        </div>
    </div>
);

// --- 3. Gen Z Vibrant ---
export const GenZVibrant: React.FC<EmailTemplateProps> = ({ type, data, options }) => {
    const bgColor = options?.themeColor || '#7c3aed';
    return (
        <div style={{ width: '100%', maxWidth: '600px', margin: '0 auto', fontFamily: fontFamilySans, color: '#000000', padding: '32px', backgroundColor: bgColor }}>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '4px solid #000000', boxShadow: '12px 12px 0px #000000', position: 'relative' }}>
                {data.bannerUrl && <div style={{ height: '192px', backgroundImage: `url(${data.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '4px solid #000000' }} />}

                <div style={{ backgroundColor: '#facc15', padding: '32px', borderBottom: '4px solid #000000', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <span style={{ backgroundColor: '#000000', color: '#ffffff', padding: '4px 12px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: '9999px', marginBottom: '12px', display: 'inline-block' }}>
                            {type === 'update' ? 'THE TEA ☕️' : `Order #${data.orderId}`}
                        </span>
                        <h1 style={{ fontWeight: '900', fontSize: '36px', lineHeight: '1', fontStyle: 'italic', letterSpacing: '-0.05em', marginBottom: '8px', margin: '0 0 8px 0' }}>
                            {type === 'update' ? data.subject?.toUpperCase() : `YOOO ${data.userName?.toUpperCase()}! 👋`}
                        </h1>
                        <p style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>
                            {type === 'update' ? "Check this out right now." : "We got the goods. Cooking now. 🍳"}
                        </p>
                    </div>
                </div>

                {type === 'order' && (
                    <div style={{ padding: '24px', borderBottom: '4px solid #000000', backgroundColor: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '8px' }}>
                            <span>Confirmed</span>
                            <span style={{ color: '#7c3aed' }}>Cooking</span>
                            <span style={{ color: '#d1d5db' }}>On way</span>
                        </div>
                        <div style={{ height: '16px', backgroundColor: '#e5e7eb', borderRadius: '9999px', border: '2px solid #000000', overflow: 'hidden', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '45%', backgroundColor: '#7c3aed', borderRight: '2px solid #000000' }}></div>
                        </div>
                    </div>
                )}

                <div style={{ padding: '32px', backgroundColor: '#ffffff' }}>
                    {type === 'update' ? (
                        <p style={{ fontWeight: 'bold', fontSize: '20px', lineHeight: '1.625', margin: 0 }}>{data.message}</p>
                    ) : (
                        <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', border: '2px dashed #000000', marginBottom: '24px' }}>
                            <h3 style={{ fontWeight: '900', fontSize: '20px', marginBottom: '16px', textTransform: 'uppercase', margin: '0 0 16px 0' }}>The Stash</h3>
                            <div style={{ width: '100%' }}>
                                {data.items?.map((i, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ backgroundColor: '#000000', color: '#ffffff', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', fontSize: '12px', marginRight: '12px' }}>{i.qty}</span>
                                            <span>{i.name}</span>
                                        </div>
                                        <span>₹{i.price}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div style={{ backgroundColor: '#000000', padding: '16px', textAlign: 'center', color: '#ffffff' }}>
                    {options?.showSocial && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.1em' }}>
                            <span style={{ margin: '0 8px' }}>IG</span> • <span style={{ margin: '0 8px' }}>TW</span> • <span style={{ margin: '0 8px' }}>YT</span>
                        </div>
                    )}
                    {options?.showQr && (
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ backgroundColor: '#ffffff', padding: '8px', border: '4px solid #000000', transform: 'rotate(3deg)', display: 'inline-block' }}>
                                <div style={{ width: '64px', height: '64px', backgroundColor: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '8px', fontFamily: fontFamilyMono }}>SCAN</div>
                            </div>
                        </div>
                    )}
                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Stay Hungry • Snackzo inc.</p>
                    {options?.showFooter && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '8px', fontFamily: fontFamilyMono, margin: '8px 0 0 0' }}>ALL RIGHTS RESERVED 2026</p>}
                </div>
            </div>
        </div>
    );
};

// --- 4. Digital Receipt (Thermal) ---
export const PaperReceipt: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#e5e7eb', margin: '0 auto', fontFamily: fontFamilyMono, color: '#1f2937', padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: '380px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', position: 'relative', fontSize: '12px', lineHeight: '1.625', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', paddingBottom: '16px', marginBottom: '16px', borderBottom: '2px dashed #000000' }}>
                <h2 style={{ fontSize: '30px', fontWeight: '900', letterSpacing: '0.1em', marginBottom: '8px', margin: '0 0 8px 0' }}>SNACKZO</h2>
                <p style={{ margin: 0 }}>GSTIN: 33AABCU9603R1Z</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '8px' }}>
                    <span>DATE: {data.date || '30/01/26'}</span>
                    <span>TYPE: {type.toUpperCase()}</span>
                </div>
            </div>

            {type === 'update' ? (
                <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', textTransform: 'uppercase', margin: '0 0 16px 0' }}>{data.subject}</h3>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{data.message}</p>
                </div>
            ) : (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', borderBottom: '1px solid #000000', paddingBottom: '4px' }}>
                        <span style={{ width: '32px' }}>QTY</span>
                        <span style={{ flex: 1 }}>ITEM</span>
                        <span style={{ width: '48px', textAlign: 'right' }}>AMT</span>
                    </div>
                    {data.items?.map((i, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ width: '32px' }}>{i.qty}</span>
                            <span style={{ flex: 1 }}>{i.name.toUpperCase()}</span>
                            <span style={{ width: '48px', textAlign: 'right' }}>{i.price.toFixed(2)}</span>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '18px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #000000' }}>
                        <span>TOTAL</span>
                        <span>₹{data.amount?.toFixed(2)}</span>
                    </div>
                </div>
            )}

            <div style={{ marginTop: '24px', marginBottom: '8px', height: '48px', backgroundColor: '#111827', width: '100%', opacity: '0.8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#ffffff', fontSize: '10px', letterSpacing: '5px' }}>* SNACKZO *</span>
            </div>
            {/* Dashed line footer instead of zigzag for email safety */}
            <div style={{ borderTop: '2px dashed #000000', width: '100%', marginTop: '8px' }}></div>
        </div>
    </div>
);

// --- 5. Dark Mode Premium ---
export const DarkModePremium: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#09090b', margin: '0 auto', fontFamily: fontFamilySans, color: '#ffffff', padding: '32px' }}>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#18181b' }}>
            {data.bannerUrl && <img src={data.bannerUrl} style={{ width: '100%', height: '192px', objectFit: 'cover', opacity: '0.8', display: 'block' }} />}
            <div style={{ background: 'linear-gradient(to right, #4c1d95, #312e81)', padding: '32px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'white' }}>{type === 'update' ? data.subject : "Order Confirmed"}</h1>
            </div>
            <div style={{ padding: '32px' }}>
                {type === 'update' ? (
                    <p style={{ color: '#d1d5db', lineHeight: '1.625', textAlign: 'center', margin: 0 }}>{data.message}</p>
                ) : (
                    <div style={{ width: '100%' }}>
                        {data.items?.map((i, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
                                <div>
                                    <p style={{ fontWeight: '500', margin: '0 0 4px 0' }}>{i.name}</p>
                                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>Qty: {i.qty}</p>
                                </div>
                                <p style={{ fontFamily: fontFamilyMono, margin: 0 }}>₹{i.price}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div style={{ marginTop: '16px' }}>
                    <a href="#" style={{ display: 'block', width: '100%', paddingTop: '16px', paddingBottom: '16px', backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold', borderRadius: '8px', textAlign: 'center', textDecoration: 'none' }}>
                        Access Dashboard
                    </a>
                </div>
            </div>
        </div>
    </div>
);

// --- 6. Luxury Concierge ---
export const LuxuryConcierge: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div style={{ width: '100%', maxWidth: '600px', backgroundColor: '#fdfdfd', margin: '0 auto', fontFamily: fontFamilySerif, color: '#1a1a1a', padding: '48px', border: '1px solid #e5e5e5' }}>
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.3em', fontSize: '12px', color: '#9ca3af', fontFamily: fontFamilySans }}>Snackzo Private</span>
            <div style={{ width: '1px', height: '48px', backgroundColor: '#e5e5e5', margin: '24px auto' }}></div>
            <h1 style={{ fontSize: '36px', fontStyle: 'italic', fontWeight: '300', margin: 0 }}>{type === 'update' ? 'An Invitation' : 'Order Confirmed'}</h1>
        </div>
        <div style={{ maxWidth: '320px', margin: '0 auto', textAlign: 'center' }}>
            {type === 'update' ? (
                <>
                    <h2 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '16px', margin: '0 0 16px 0' }}>{data.subject}</h2>
                    <p style={{ fontSize: '14px', lineHeight: '1.625', color: '#6b7280', fontFamily: fontFamilySans, margin: 0 }}>{data.message}</p>
                </>
            ) : (
                <>
                    <p style={{ fontSize: '14px', lineHeight: '1.625', color: '#6b7280', fontFamily: fontFamilySans, margin: '0 0 32px 0' }}>
                        We are pleased to confirm your selection, {data.userName}.
                    </p>
                    <div style={{ padding: '32px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6', marginBottom: '32px' }}>
                        <p style={{ fontSize: '36px', fontWeight: '300', margin: 0 }}>₹{data.amount}</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: fontFamilySans, margin: '8px 0 0 0' }}>Total Amount</p>
                    </div>
                </>
            )}
            <a href="#" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', borderBottom: '1px solid #000000', paddingBottom: '4px', color: '#1a1a1a', textDecoration: 'none', fontFamily: fontFamilySans }}>
                View Details
            </a>
        </div>
    </div>
);

export const TEMPLATES = [
    { id: "modern", name: "Modern Minimalist", component: ModernMinimalist, description: "Clean, simple, and effective." },
    { id: "fintech", name: "Corporate Fintech", component: CorporateFintech, description: "Trustworthy and professional." },
    { id: "genz", name: "Gen Z Vibrant", component: GenZVibrant, description: "High energy, bold colors, neo-brutalist." },
    { id: "dark", name: "Dark Mode Premium", component: DarkModePremium, description: "Sleek, futuristic, and elegant." },
    { id: "receipt", name: "Digital Receipt", component: PaperReceipt, description: "Classic thermal printer style." },
    { id: "luxury", name: "Luxury Concierge", component: LuxuryConcierge, description: "High-end, sophisticated serif typography." }
];
