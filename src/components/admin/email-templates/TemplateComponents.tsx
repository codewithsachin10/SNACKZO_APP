
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

// --- 1. Modern Minimalist ---
// --- 1. Modern Minimalist (SaaS Style) ---
export const ModernMinimalist: React.FC<EmailTemplateProps> = ({ type, data, options }) => (
    <div className="w-full h-full bg-white font-sans text-slate-900 flex flex-col">
        {data.bannerUrl && <img src={data.bannerUrl} alt="Banner" className="w-full h-48 object-cover" />}

        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-slate-200">S</div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">Snackzo</h1>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded-full border border-slate-200">
                {type === 'update' ? 'Broadcast' : `#${data.orderId}`}
            </span>
        </div>

        <div className="p-10 text-center flex-1">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 shadow-sm"
                style={{ backgroundColor: options?.themeColor ? options.themeColor + '15' : '#eff6ff', color: options?.themeColor || '#2563eb' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                {type === 'update' ? data.subject : "Order Confirmed"}
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed max-w-sm mx-auto">
                {type === 'update' ? data.message : `Thanks, ${data.userName}. We've received your order and are preparing it now.`}
            </p>

            {type !== 'update' && data.items && (
                <div className="mt-10 bg-slate-50/50 rounded-2xl border border-slate-100 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)] text-left">
                    <div className="space-y-4">
                        {data.items.map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm group">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-xs font-medium text-slate-500 shadow-sm">{i.qty}</span>
                                    <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{i.name}</span>
                                </div>
                                <span className="font-mono text-slate-600">₹{i.price}</span>
                            </div>
                        ))}
                        <div className="pt-4 mt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                            <span className="font-bold text-slate-900">Total Paid</span>
                            <span className="font-bold text-xl text-slate-900">₹{data.amount}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-10">
                <button className="text-white px-8 py-3.5 rounded-xl font-semibold text-sm shadow-xl hover:-translate-y-0.5 transition-all"
                    style={{ backgroundColor: options?.themeColor || '#0f172a', boxShadow: `0 10px 15px -3px ${options?.themeColor}40` }}>
                    {type === 'update' ? 'Read More' : 'Track Order Status'}
                </button>
            </div>
        </div>

        {/* Optional Components */}
        {(options?.showSocial || options?.showFooter || options?.showQr) && (
            <div className="bg-gray-50 p-6 text-center space-y-4">
                {options.showSocial && (
                    <div className="flex justify-center gap-4 text-gray-400">
                        <span>Instagram</span> • <span>Twitter</span> • <span>LinkedIn</span>
                    </div>
                )}
                {options.showQr && (
                    <div className="pt-2 flex justify-center">
                        <div className="bg-white p-2 border rounded-lg inline-block">
                            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-gray-400 text-[8px]">QR CODE</div>
                        </div>
                    </div>
                )}
                {options.showFooter && (
                    <p className="text-xs text-gray-400">© 2026 Snackzo Inc. All rights reserved.</p>
                )}
            </div>
        )}
    </div>
);

// --- 2. Corporate Fintech ---
export const CorporateFintech: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div className="w-full max-w-[600px] bg-[#f7f9fc] mx-auto font-sans text-[#333] p-10">
        <div className="bg-white border-t-4 border-blue-600 shadow-sm p-0">
            {data.bannerUrl && <img src={data.bannerUrl} alt="Banner" className="w-full h-40 object-cover" />}
            <div className="p-8 border-b border-gray-100 flex justify-between">
                <span className="font-bold text-blue-600 text-lg">Snackzo</span>
                <span className="text-sm text-gray-500">{type === 'update' ? 'Official Update' : 'Receipt'}</span>
            </div>
            <div className="p-8">
                {type === 'update' ? (
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">{data.subject}</h2>
                        <p className="text-gray-600 leading-relaxed">{data.message}</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <p className="text-sm text-gray-500 uppercase tracking-wider text-[10px] font-bold">Amount Paid</p>
                            <h1 className="text-4xl font-mono mt-1">₹{data.amount}.00</h1>
                        </div>
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="text-xs text-gray-400 uppercase text-left border-b">
                                    <th className="font-medium py-2">Description</th>
                                    <th className="font-medium py-2 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.items?.map((i, idx) => (
                                    <tr key={idx} className="border-b border-gray-50">
                                        <td className="py-3">{i.name} x {i.qty}</td>
                                        <td className="py-3 text-right">₹{i.price.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </>
                )}
                <div className="mt-8">
                    <span className="text-blue-600 text-sm hover:underline cursor-pointer">View in Dashboard ↗</span>
                </div>
            </div>
            <div className="bg-gray-50 p-6 text-xs text-gray-400">
                Questions? Contact support@snackzo.tech
            </div>
        </div>
    </div>
);

// --- 3. Gen Z Vibrant ---
export const GenZVibrant: React.FC<EmailTemplateProps> = ({ type, data, options }) => (
    <div className="w-full max-w-[600px] mx-auto font-sans text-black p-8" style={{ backgroundColor: options?.themeColor || '#7c3aed' }}>
        <div className="bg-white rounded-[20px] overflow-hidden border-4 border-black shadow-[12px_12px_0px_#000000] relative">
            {data.bannerUrl && <div className="h-48 bg-cover bg-center border-b-4 border-black" style={{ backgroundImage: `url(${data.bannerUrl})` }} />}

            <div className="bg-[#facc15] p-8 border-b-4 border-black relative overflow-hidden">
                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white rounded-full border-4 border-black z-0 opacity-50"></div>
                <div className="relative z-10">
                    <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full mb-3 inline-block">
                        {type === 'update' ? 'THE TEA ☕️' : `Order #${data.orderId}`}
                    </span>
                    <h1 className="font-black text-4xl leading-[0.9] italic tracking-tighter mb-2">
                        {type === 'update' ? data.subject?.toUpperCase() : `YOOO ${data.userName?.toUpperCase()}! 👋`}
                    </h1>
                    <p className="font-bold text-lg">
                        {type === 'update' ? "Check this out right now." : "We got the goods. Cooking now. 🍳"}
                    </p>
                </div>
            </div>

            {type === 'order' && (
                <div className="p-6 border-b-4 border-black bg-white">
                    <div className="flex justify-between text-xs font-black uppercase mb-2">
                        <span>Confirmed</span>
                        <span className="text-[#7c3aed]">Cooking</span>
                        <span className="text-gray-300">On way</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full border-2 border-black overflow-hidden relative">
                        <div className="absolute top-0 left-0 h-full w-[45%] bg-[#7c3aed] border-r-2 border-black"></div>
                    </div>
                </div>
            )}

            <div className="p-8 bg-white">
                {type === 'update' ? (
                    <p className="font-bold text-xl leading-relaxed">{data.message}</p>
                ) : (
                    <div className="bg-gray-50 p-6 rounded-xl border-2 border-black border-dashed mb-6">
                        <h3 className="font-black text-xl mb-4 uppercase">The Stash</h3>
                        <div className="space-y-3">
                            {data.items?.map(i => (
                                <div key={i.name} className="flex justify-between items-center font-bold">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-black text-white w-6 h-6 flex items-center justify-center rounded-md text-xs">{i.qty}</span>
                                        <span>{i.name}</span>
                                    </div>
                                    <span>₹{i.price}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
            <div className="bg-black p-4 text-center">
                {options?.showSocial && (
                    <div className="flex justify-center gap-4 text-white text-xs uppercase font-black mb-4 tracking-widest">
                        <span>IG</span> • <span>TW</span> • <span>YT</span>
                    </div>
                )}
                {options?.showQr && (
                    <div className="mb-4 flex justify-center">
                        <div className="bg-white p-2 border-4 border-black rotate-3 hover:rotate-0 transition-transform">
                            <div className="w-16 h-16 bg-black flex items-center justify-center text-white text-[8px] font-mono">SCAN</div>
                        </div>
                    </div>
                )}
                <p className="text-white text-xs font-bold uppercase tracking-widest">Stay Hungry • Snackzo inc.</p>
                {options?.showFooter && <p className="text-white/50 text-[10px] mt-2 font-mono">ALL RIGHTS RESERVED 2026</p>}
            </div>
        </div>
    </div>
);

// --- 4. Digital Receipt (Thermal) ---
export const PaperReceipt: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div className="w-full max-w-[600px] bg-gray-200 mx-auto font-mono text-gray-800 p-10 flex justify-center">
        <div className="bg-white w-[380px] p-6 shadow-xl relative text-xs leading-relaxed" style={{ fontFamily: '"Courier Prime", "Courier New", monospace' }}>
            <div className="text-center pb-4 mb-4 border-b-2 border-black border-dashed">
                <h2 className="text-3xl font-black tracking-widest mb-2">SNACKZO</h2>
                <p>GSTIN: 33AABCU9603R1Z</p>
                <div className="flex justify-between text-[10px] mt-2">
                    <span>DATE: {data.date || '30/01/26'}</span>
                    <span>TYPE: {type.toUpperCase()}</span>
                </div>
            </div>

            {type === 'update' ? (
                <div className="py-8 text-center">
                    <h3 className="text-lg font-bold mb-4 uppercase">{data.subject}</h3>
                    <p className="text-sm font-medium">{data.message}</p>
                </div>
            ) : (
                <div className="mb-4">
                    <div className="flex justify-between font-bold mb-2 text-[10px] uppercase border-b border-black pb-1">
                        <span className="w-8">QTY</span>
                        <span className="flex-1">ITEM</span>
                        <span className="w-12 text-right">AMT</span>
                    </div>
                    {data.items?.map(i => (
                        <div key={i.name} className="flex justify-between mb-1">
                            <span className="w-8">{i.qty}</span>
                            <span className="flex-1">{i.name.toUpperCase()}</span>
                            <span className="w-12 text-right">{i.price.toFixed(2)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-black">
                        <span>TOTAL</span>
                        <span>₹{data.amount?.toFixed(2)}</span>
                    </div>
                </div>
            )}

            <div className="mt-6 mb-2 h-12 bg-gray-900 w-full opacity-80 flex items-center justify-center">
                <span className="text-white text-[10px] tracking-[5px]">* SNACKZO *</span>
            </div>
            <div className="absolute bottom-[-6px] left-0 w-full h-[6px] bg-transparent bg-[radial-gradient(circle,white_3px,transparent_4px)] bg-[length:10px_10px] rotate-180"></div>
        </div>
    </div>
);

// --- 5. Dark Mode Premium ---
export const DarkModePremium: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div className="w-full max-w-[600px] bg-[#09090b] mx-auto font-sans text-white p-8">
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#18181b]">
            {data.bannerUrl && <img src={data.bannerUrl} className="w-full h-48 object-cover opacity-80" />}
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-8 text-center">
                <h1 className="text-2xl font-bold">{type === 'update' ? data.subject : "Order Confirmed"}</h1>
            </div>
            <div className="p-8 space-y-4">
                {type === 'update' ? (
                    <p className="text-gray-300 leading-relaxed text-center">{data.message}</p>
                ) : (
                    data.items?.map(i => (
                        <div key={i.name} className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5">
                            <div>
                                <p className="font-medium">{i.name}</p>
                                <p className="text-xs text-white/40">Qty: {i.qty}</p>
                            </div>
                            <p className="font-mono">₹{i.price}</p>
                        </div>
                    ))
                )}
                <button className="w-full py-4 mt-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                    Access Dashboard
                </button>
            </div>
        </div>
    </div>
);

// --- 6. Luxury Concierge ---
export const LuxuryConcierge: React.FC<EmailTemplateProps> = ({ type, data }) => (
    <div className="w-full max-w-[600px] bg-[#fdfdfd] mx-auto font-serif text-[#1a1a1a] p-12 border">
        <div className="text-center mb-16">
            <span className="uppercase tracking-[0.3em] text-xs text-gray-400">Snackzo Private</span>
            <div className="w-px h-12 bg-gray-200 mx-auto my-6"></div>
            <h1 className="text-4xl italic font-light">{type === 'update' ? 'An Invitation' : 'Order Confirmed'}</h1>
        </div>
        <div className="max-w-xs mx-auto text-center space-y-6">
            {type === 'update' ? (
                <>
                    <h2 className="text-xl font-medium">{data.subject}</h2>
                    <p className="text-sm leading-relaxed text-gray-500 font-sans">{data.message}</p>
                </>
            ) : (
                <>
                    <p className="text-sm leading-relaxed text-gray-500 font-sans">
                        We are pleased to confirm your selection, {data.userName}.
                    </p>
                    <div className="py-8 border-t border-b border-gray-100">
                        <p className="text-4xl font-light">₹{data.amount}</p>
                        <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-sans">Total Amount</p>
                    </div>
                </>
            )}
            <button className="text-xs uppercase tracking-widest border-b border-black pb-1 hover:text-gray-600 transition font-sans">
                View Details
            </button>
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
