import { useRef, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Share2, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

interface Order {
    id: string;
    created_at: string;
    total: number;
    delivery_fee: number;
    platform_fee: number;
    status: string;
    payment_method: string;
    profile: {
        full_name: string;
        phone: string;
        hostel_block: string;
        room_number: string;
    };
    order_items: {
        id: string;
        quantity: number;
        price: number;
        product: {
            name: string;
        };
    }[];
}

const Receipt = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const receiptRef = useRef<HTMLDivElement>(null);
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return;
            try {
                const { data, error } = await supabase
                    .from("orders")
                    .select(`
            *,
            profile:profiles(*),
            order_items:order_items(
              *,
              product:products(name)
            )
          `)
                    .eq("id", orderId)
                    .single();

                if (error) throw error;
                setOrder(data as unknown as Order);
            } catch (error) {
                console.error("Error fetching order:", error);
                toast.error("Could not load receipt");
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId]);

    const handleDownloadPDF = async () => {
        if (!receiptRef.current) return;

        try {
            const canvas = await html2canvas(receiptRef.current, { scale: 2 });
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`SNACKZO-Receipt-${orderId?.slice(0, 8)}.pdf`);
            toast.success("Receipt downloaded!");
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF");
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'SNACKZO Receipt',
                    text: `Here is my order receipt from SNACKZO!`,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied to clipboard!");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading Receipt...</div>;
    if (!order) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Order not found</div>;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-md mb-6 flex items-center justify-between">
                <Button variant="ghost" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-white mb-4">
                    <ArrowLeft size={20} className="mr-2" /> Back
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleShare}>
                        <Share2 size={16} className="mr-2" /> Share
                    </Button>
                    <Button size="sm" onClick={handleDownloadPDF} className="bg-lime text-black hover:bg-lime/90">
                        <Download size={16} className="mr-2" /> PDF
                    </Button>
                </div>
            </div>

            <Card ref={receiptRef} className="w-full max-w-md bg-white text-black p-8 rounded-none shadow-2xl overflow-hidden relative print:shadow-none">
                {/* Decorative Top */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#000_10px,#000_20px)] opacity-10"></div>

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black tracking-tighter mb-1">SNACKZO</h1>
                    <p className="text-sm text-gray-500 uppercase tracking-widest">Instant Delivery</p>
                    <div className="border-b-2 border-dashed border-gray-300 my-6"></div>
                </div>

                <div className="space-y-1 mb-6 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="font-medium">{format(new Date(order.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Order ID</span>
                        <span className="font-mono">#{order.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-medium">{order.profile.full_name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-medium">{order.profile.phone}</span>
                    </div>
                </div>

                <div className="border-b-2 border-gray-100 mb-6"></div>

                <div className="space-y-3 mb-6">
                    {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start text-sm">
                            <div className="flex-1">
                                <span className="font-bold">{item.quantity}x</span> {item.product.name}
                            </div>
                            <span className="font-mono">₹{item.price * item.quantity}</span>
                        </div>
                    ))}
                </div>

                <div className="border-b-2 border-gray-100 mb-6"></div>

                <div className="space-y-2 mb-8 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>₹{order.total - order.delivery_fee - order.platform_fee}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span>₹{order.delivery_fee}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Platform Fee</span>
                        <span>₹{order.platform_fee}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black mt-4 pt-4 border-t-2 border-black">
                        <span>TOTAL</span>
                        <span>₹{order.total}</span>
                    </div>
                    <div className="text-center text-xs text-gray-500 mt-2">
                        PAID VIA {order.payment_method.toUpperCase()}
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <div className="inline-block p-2 border-2 border-black rounded-lg">
                        <p className="text-xs font-bold uppercase">Authorized</p>
                        <p className="text-[10px] text-gray-500">SNACKZO SYSTEM</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">Thank you for ordering!</p>
                    <p className="text-xs text-gray-400">www.snackzo.app</p>
                </div>

                {/* Decorative Bottom */}
                <div className="absolute bottom-0 left-0 w-full h-4 bg-[radial-gradient(circle,black_2px,transparent_2.5px)] bg-[length:10px_10px] opacity-10"></div>
            </Card>

            <style>{`
        @media print {
            body * {
                visibility: hidden;
            }
            .min-h-screen {
                background: white;
                color: black;
                padding: 0;
            }
            .print\\:shadow-none {
                box-shadow: none;
                border: none;
            }
            div[class*="Card"] {
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 20px;
            }
            button {
                display: none;
            }
        }
      `}</style>
        </div>
    );
};

export default Receipt;
