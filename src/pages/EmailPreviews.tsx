
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- MOCK DATA ---
const sampleOrder = {
    id: "EF3D160A",
    date: "Jan 30, 2026",
    userName: "Sachin",
    items: [
        { name: "Spicy Lays (Family Pack)", qty: 2, price: 40 },
        { name: "Thums Up (500ml)", qty: 1, price: 45 },
        { name: "Snickers Bar", qty: 3, price: 60 }
    ],
    subtotal: 145,
    delivery: 20,
    total: 165,
    address: "Hostel Block A, Room 304"
};

// --- STYLES ---

const ModernMinimalist = () => (
    <div className="w-[600px] bg-white mx-auto font-sans text-gray-800 border">
        <div className="p-8 border-b">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">Snackzo.</h1>
                <span className="text-sm font-medium text-gray-500">Order #EF3D160A</span>
            </div>
        </div>
        <div className="p-12 text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">It's ordered.</h2>
            <p className="text-gray-500 text-lg">Thanks Sachin. You're all set.</p>
        </div>
        <div className="px-12 pb-12">
            <table className="w-full text-sm">
                {sampleOrder.items.map(i => (
                    <tr key={i.name} className="border-b border-gray-100">
                        <td className="py-4 font-medium text-gray-900">{i.name} <span className="text-gray-400">×{i.qty}</span></td>
                        <td className="py-4 text-right text-gray-600">₹{i.price}</td>
                    </tr>
                ))}
                <tr>
                    <td className="py-4 font-bold text-gray-900 pt-8">Total</td>
                    <td className="py-4 text-right font-bold text-gray-900 pt-8">₹{sampleOrder.total}</td>
                </tr>
            </table>
            <div className="mt-8 text-center">
                <button className="bg-black text-white px-6 py-3 rounded-full font-medium text-sm">Track Order</button>
            </div>
        </div>
    </div>
);

const CorporateFintech = () => (
    <div className="w-[600px] bg-[#f7f9fc] mx-auto font-sans text-[#333] p-10">
        <div className="bg-white border-t-4 border-blue-600 shadow-sm p-0">
            <div className="p-8 border-b border-gray-100 flex justify-between">
                <span className="font-bold text-blue-600 text-lg">Snackzo</span>
                <span className="text-sm text-gray-500">Receipt</span>
            </div>
            <div className="p-8">
                <div className="mb-8">
                    <p className="text-sm text-gray-500 uppercase tracking-wider text-[10px] font-bold">Amount Paid</p>
                    <h1 className="text-4xl font-mono mt-1">₹{sampleOrder.total}.00</h1>
                </div>

                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="text-xs text-gray-400 uppercase text-left border-b">
                            <th className="font-medium py-2">Description</th>
                            <th className="font-medium py-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sampleOrder.items.map(i => (
                            <tr key={i.name} className="border-b border-gray-50">
                                <td className="py-3">{i.name} x {i.qty}</td>
                                <td className="py-3 text-right">₹{i.price.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-8 flex justify-between text-sm py-2 border-t border-gray-100 pt-4">
                    <span className="font-bold">Total</span>
                    <span className="font-bold">₹{sampleOrder.total.toFixed(2)}</span>
                </div>

                <div className="mt-8">
                    <a href="#" className="text-blue-600 text-sm hover:underline">Download Invoice PDF ↗</a>
                </div>
            </div>
            <div className="bg-gray-50 p-6 text-xs text-gray-400">
                Questions? Contact support@snackzo.tech
            </div>
        </div>
    </div>
);

const DarkModePremium = () => (
    <div className="w-[600px] bg-[#09090b] mx-auto font-sans text-white p-8">
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#18181b]">
            <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-8 text-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🍔</div>
                <h1 className="text-2xl font-bold">Fuel Incoming!</h1>
                <p className="text-white/60 text-sm mt-2">Order #{sampleOrder.id}</p>
            </div>
            <div className="p-8 space-y-4">
                {sampleOrder.items.map(i => (
                    <div key={i.name} className="flex justify-between items-center bg-white/5 p-4 rounded-lg border border-white/5">
                        <div>
                            <p className="font-medium">{i.name}</p>
                            <p className="text-xs text-white/40">Qty: {i.qty}</p>
                        </div>
                        <p className="font-mono">₹{i.price}</p>
                    </div>
                ))}

                <div className="mt-6 p-4 border-t border-dashed border-white/10 flex justify-between items-center">
                    <span className="text-white/60">Total Paid</span>
                    <span className="text-2xl font-bold text-green-400">₹{sampleOrder.total}</span>
                </div>

                <button className="w-full py-4 mt-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition">
                    Track Delivery
                </button>
            </div>
        </div>
        <p className="text-center text-xs text-white/20 mt-8">Sent from the void • Snackzo</p>
    </div>
);

const GenZVibrant = () => (
    <div className="w-[600px] bg-[#7c3aed] mx-auto font-sans text-black p-8">

        {/* Main Card */}
        <div className="bg-white rounded-[20px] overflow-hidden border-4 border-black shadow-[12px_12px_0px_#000000] relative">

            {/* Header Section */}
            <div className="bg-[#facc15] p-8 border-b-4 border-black relative overflow-hidden">
                {/* Decorative shapes */}
                <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-white rounded-full border-4 border-black z-0 opacity-50"></div>

                <div className="relative z-10">
                    <span className="bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest rounded-full mb-3 inline-block">
                        Order #{sampleOrder.id}
                    </span>
                    <h1 className="font-black text-5xl leading-[0.9] italic tracking-tighter mb-2">
                        YOOO<br />SACHIN! 👋
                    </h1>
                    <p className="font-bold text-lg">We got the goods. Cooking now. 🍳</p>
                </div>
            </div>

            {/* Progress Bar (Visual) */}
            <div className="p-6 border-b-4 border-black bg-white">
                <div className="flex justify-between text-xs font-black uppercase mb-2">
                    <span>Confirmed</span>
                    <span className="text-[#7c3aed]">Cooking</span>
                    <span className="text-gray-300">On way</span>
                    <span className="text-gray-300">Eaten</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full border-2 border-black overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full w-[45%] bg-[#7c3aed] border-r-2 border-black">
                        <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.2)_5px,rgba(255,255,255,0.2)_10px)]"></div>
                    </div>
                </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 border-b-4 border-black">
                <div className="p-4 border-r-4 border-black bg-[#e0e7ff]">
                    <p className="text-[10px] uppercase font-bold text-gray-500">ETA</p>
                    <p className="font-black text-xl">15 MINS ⚡️</p>
                </div>
                <div className="p-4 bg-[#ffedd5]">
                    <p className="text-[10px] uppercase font-bold text-gray-500">Location</p>
                    <p className="font-black text-sm truncate">{sampleOrder.address}</p>
                </div>
            </div>

            {/* Receipt Section */}
            <div className="p-8 bg-white">
                <div className="bg-gray-50 p-6 rounded-xl border-2 border-black border-dashed mb-6">
                    <h3 className="font-black text-xl mb-4 uppercase">The Stash</h3>
                    <div className="space-y-3">
                        {sampleOrder.items.map(i => (
                            <div key={i.name} className="flex justify-between items-center font-bold">
                                <div className="flex items-center gap-3">
                                    <span className="bg-black text-white w-6 h-6 flex items-center justify-center rounded-md text-xs">{i.qty}</span>
                                    <span>{i.name}</span>
                                </div>
                                <span>₹{i.price}</span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 pt-4 border-t-2 border-black flex justify-between items-center">
                        <span className="font-bold uppercase text-sm">Amount Paid</span>
                        <span className="font-black text-3xl text-[#7c3aed]">₹{sampleOrder.total}</span>
                    </div>
                </div>

                {/* CTAs */}
                <div className="flex flex-col gap-3">
                    <button className="bg-black text-white font-black text-lg py-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_#7c3aed] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#7c3aed] transition-all">
                        TRACK MY SNACKS 🛵
                    </button>
                    <button className="bg-white text-black font-bold py-3 rounded-xl border-2 border-black hover:bg-gray-50">
                        View Tax Invoice 📄
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-black p-4 text-center">
                <p className="text-white text-xs font-bold uppercase tracking-widest">Stay Hungry • Snackzo inc.</p>
            </div>

        </div>
    </div>
);
const PaperReceipt = () => (
    <div className="w-[600px] bg-gray-200 mx-auto font-mono text-gray-800 p-10 flex justify-center">
        <div className="bg-white w-[380px] p-6 shadow-xl relative text-xs leading-relaxed" style={{ fontFamily: '"Courier Prime", "Courier New", monospace' }}>

            {/* Header */}
            <div className="text-center pb-4 mb-4 border-b-2 border-black border-dashed">
                <h2 className="text-3xl font-black tracking-widest mb-2">SNACKZO</h2>
                <p className="font-bold">INSTANT HOSTEL DELIVERY</p>
                <p>Block A, SRM University</p>
                <p>GSTIN: 33AABCU9603R1Z</p>
                <p>FSSAI: 12416023000451</p>

                <div className="mt-4 flex justify-between text-[10px]">
                    <span>D: {new Date().toLocaleDateString()}</span>
                    <span>T: {new Date().toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                    <span>ORD: #{sampleOrder.id}</span>
                    <span>TERM: KIOSK-04</span>
                </div>
            </div>

            {/* Customer */}
            <div className="mb-4 pb-4 border-b-2 border-black border-dashed">
                <p className="uppercase font-bold">CUSTOMER: {sampleOrder.userName}</p>
                <p className="uppercase">{sampleOrder.address}</p>
            </div>

            {/* Items */}
            <div className="mb-4">
                <div className="flex justify-between font-bold mb-2 text-[10px] uppercase border-b border-black pb-1">
                    <span className="w-8">QTY</span>
                    <span className="flex-1">ITEM</span>
                    <span className="w-12 text-right">AMT</span>
                </div>
                {sampleOrder.items.map(i => (
                    <div key={i.name} className="flex justify-between mb-1">
                        <span className="w-8">{i.qty}</span>
                        <span className="flex-1">{i.name.toUpperCase()}</span>
                        <span className="w-12 text-right">{i.price.toFixed(2)}</span>
                    </div>
                ))}
            </div>

            {/* Totals */}
            <div className="border-t-2 border-black border-dashed pt-2 mb-4">
                <div className="flex justify-between">
                    <span>SUBTOTAL</span>
                    <span>{sampleOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>DELIVERY CHG</span>
                    <span>{sampleOrder.delivery.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span>TAX (5% GST)</span>
                    <span>{(sampleOrder.total * 0.05).toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-black">
                    <span>TOTAL</span>
                    <span>₹{sampleOrder.total.toFixed(2)}</span>
                </div>
            </div>

            {/* Payment Info */}
            <div className="mb-6 text-center border-2 border-black p-2 rounded-sm">
                <p className="font-bold text-sm">PAID: UPI</p>
                <p className="text-[10px]">REF: {Math.floor(Math.random() * 100000000)}</p>
                <p className="text-[10px]">AUTH: APPROVED</p>
            </div>

            {/* Footer */}
            <div className="text-center text-[10px] space-y-1">
                <p className="font-bold text-sm">*** FEED YOUR CRAVINGS ***</p>
                <p>Thank you for choosing Snackzo!</p>
                <p>For support: support@snackzo.tech</p>
            </div>

            {/* Barcode Simulation */}
            <div className="mt-6 mb-2 h-12 bg-gray-900 w-full opacity-80 flex items-center justify-center">
                <span className="text-white text-[10px] tracking-[5px]">* {sampleOrder.id} *</span>
            </div>

            {/* Bottom Rip */}
            <div className="absolute bottom-[-6px] left-0 w-full h-[6px] bg-transparent bg-[radial-gradient(circle,white_3px,transparent_4px)] bg-[length:10px_10px] rotate-180"></div>
        </div>
    </div>
);

const LuxuryConcierge = () => (
    <div className="w-[600px] bg-[#fdfdfd] mx-auto font-serif text-[#1a1a1a] p-12 border">
        <div className="text-center mb-16">
            <span className="uppercase tracking-[0.3em] text-xs text-gray-400">Snackzo Private</span>
            <div className="w-px h-12 bg-gray-200 mx-auto my-6"></div>
            <h1 className="text-4xl italic font-light">Order Confirmed</h1>
        </div>

        <div className="max-w-xs mx-auto text-center space-y-6">
            <p className="text-sm leading-relaxed text-gray-500 font-sans">
                We are pleased to confirm your selection, Sachin. Your order is currently being prepared with the utmost care.
            </p>
            <div className="py-8 border-t border-b border-gray-100">
                <p className="text-4xl font-light">₹{sampleOrder.total}</p>
                <p className="text-xs text-gray-400 mt-2 uppercase tracking-widest font-sans">Total Amount</p>
            </div>
            <button className="text-xs uppercase tracking-widest border-b border-black pb-1 hover:text-gray-600 transition font-sans">
                View Receipt
            </button>
        </div>
    </div>
);

// --- MAIN PAGE ---

const EmailPreviews = () => {
    const [activeTab, setActiveTab] = useState("modern");
    const navigate = useNavigate();

    const templates = [
        { id: "modern", name: "Modern Minimalist", component: ModernMinimalist },
        { id: "fintech", name: "Corporate Fintech", component: CorporateFintech },
        { id: "dark", name: "Dark Mode Premium", component: DarkModePremium },
        { id: "genz", name: "Gen Z Vibrant", component: GenZVibrant },
        { id: "receipt", name: "Digital Receipt", component: PaperReceipt },
        { id: "luxury", name: "Luxury Concierge", component: LuxuryConcierge },
    ];

    const ActiveComponent = templates.find(t => t.id === activeTab)?.component || ModernMinimalist;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" onClick={() => navigate(-1)}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Email Template Gallery</h1>
                        <p className="text-gray-500">Preview high-fidelity email designs for Snackzo</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <Card className="p-4 h-fit">
                        <h3 className="font-medium mb-4 px-2">Select Style</h3>
                        <div className="space-y-2">
                            {templates.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-gray-100 text-gray-600"
                                        }`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Preview Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-gray-300 rounded-xl p-8 overflow-auto shadow-inner min-h-[800px] flex items-center justify-center">
                            <div className="shadow-2xl transition-all duration-500 transform scale-100">
                                <ActiveComponent />
                            </div>
                        </div>
                        <p className="text-center text-gray-500 mt-4 text-sm">
                            * Note: These are HTML representations. Actual emails will be rendered using inline CSS tables for compatibility.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmailPreviews;
