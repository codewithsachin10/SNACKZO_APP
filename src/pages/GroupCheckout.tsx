import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
    ArrowLeft, Users, CreditCard, ShoppingCart, Lock,
    MapPin, Clock, Check, Wallet, AlertCircle
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface GroupOrder {
    id: string;
    name: string;
    invitation_code: string;
    hostel_block: string;
    delivery_address: string;
    order_deadline: string;
    status: string;
    created_by: string;
    min_order_amount: number;
}

interface GroupMember {
    id: string;
    user_id: string;
    is_admin: boolean;
    has_paid: boolean;
    profiles: { full_name: string; wallet_balance: number };
}

interface GroupItem {
    id: string;
    product_name: string;
    quantity: number;
    price: number;
    member_id: string;
    product_id: string;
}

const GroupCheckout = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [group, setGroup] = useState<GroupOrder | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [items, setItems] = useState<GroupItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<"wallet" | "cod" | "razorpay">("razorpay");

    useEffect(() => {
        if (!user) {
            navigate("/auth");
            return;
        }
        fetchGroupDetails();
    }, [user, groupId]);

    const fetchGroupDetails = async () => {
        try {
            if (!groupId) return;

            // 1. Fetch Group Info
            const { data: groupData, error: groupError } = await supabase
                .from("group_orders" as any)
                .select("*")
                .eq("id", groupId)
                .single();

            if (groupError || !groupData) throw new Error("Group not found");
            setGroup(groupData as unknown as GroupOrder);

            // 2. Fetch Members (Manual Profile Join)
            const { data: membersData } = await supabase
                .from("group_order_members" as any)
                .select("*")
                .eq("group_order_id", groupId);

            const rawMembers = membersData as unknown as GroupMember[] || [];

            // Fetch profiles manually
            const userIds = rawMembers.map(m => m.user_id);
            let profilesData: any[] = [];

            if (userIds.length > 0) {
                const { data } = await supabase
                    .from('profiles')
                    .select('user_id, full_name, wallet_balance')
                    .in('user_id', userIds);
                profilesData = data || [];
            }

            const enrichedMembers = rawMembers.map(member => ({
                ...member,
                profiles: profilesData.find(p => p.user_id === member.user_id) || { full_name: 'Unknown User', wallet_balance: 0 }
            }));

            setMembers(enrichedMembers);

            // 3. Fetch Items
            const { data: itemsData } = await supabase
                .from("group_order_items" as any)
                .select("*")
                .eq("group_order_id", groupId);

            setItems(itemsData as unknown as GroupItem[] || []);
        } catch (error) {
            console.error("Error fetching group details:", error);
            // toast.error("Failed to load group order details");
            // Do not redirect immediately, let the user retry or see the error
        } finally {
            setIsLoading(false);
        }
    };

    // Calculations
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = 15; // Standard group delivery fee
    const grandTotal = totalAmount + deliveryFee;
    const deliveryPerPerson = members.length > 0 ? Math.ceil(deliveryFee / members.length) : 0;

    const currentMember = members.find(m => m.user_id === user?.id);
    const myItems = currentMember ? items.filter(i => i.member_id === currentMember.id) : [];
    const mySubtotal = myItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const myTotal = mySubtotal + deliveryPerPerson;
    const myWalletBalance = currentMember?.profiles.wallet_balance || 0;

    const isGroupCreator = group?.created_by === user?.id;

    const handlePayment = async () => {
        if (!currentMember || !group) return;

        // Check wallet balance if paying via wallet
        if (paymentMethod === "wallet" && myWalletBalance < myTotal) {
            toast.error("Insufficient wallet balance. Please top up.");
            return;
        }

        setIsProcessing(true);

        try {
            if (paymentMethod === "razorpay") {
                // 1. Create Order via Edge Function
                const { data, error } = await supabase.functions.invoke('create-razorpay-order', {
                    body: { amount: myTotal, currency: "INR" }
                });

                if (error || !data) throw new Error('Failed to create Razorpay order');

                // 2. Open Razorpay Checkout
                const options = {
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Ensure this exists in your env
                    amount: data.amount,
                    currency: data.currency,
                    name: "Hostel Hustle Group Order",
                    description: `Share for ${group.name}`,
                    order_id: data.id,
                    handler: async function (response: any) {
                        // On Success
                        await markAsPaid();
                    },
                    prefill: {
                        name: currentMember.profiles.full_name,
                        // email: user.email, // If available
                    },
                    theme: {
                        color: "#84cc16", // Lime color
                    },
                };

                const rzp = new (window as any).Razorpay(options);
                rzp.open();
                setIsProcessing(false); // Stop processing state so user can interact with modal
                return;
            }

            // Wallet or COD logic
            await markAsPaid();

        } catch (error) {
            console.error("Payment failed:", error);
            toast.error("Payment failed. Please try again.");
            setIsProcessing(false);
        }
    };

    const markAsPaid = async () => {
        try {
            // 1. Mark member as paid
            const { error: updateError } = await supabase
                .from("group_order_members" as any)
                .update({ has_paid: true })
                .eq("id", currentMember?.id);

            if (updateError) throw updateError;

            // 2. Deduct from wallet if applicable
            if (paymentMethod === "wallet") {
                await supabase.from("wallet_transactions").insert({
                    user_id: user!.id,
                    amount: myTotal,
                    transaction_type: "debit",
                    description: `Group Order: ${group?.name}`,
                });
            }

            toast.success("Payment successful!");
            fetchGroupDetails();
        } catch (err) {
            console.error(err);
            toast.error("Failed to update payment status");
        } finally {
            setIsProcessing(false);
        }
    }

    const placeGroupOrder = async () => {
        if (!group) return;

        // Check if everyone paid (optional enforcement, skipping for now to allow flexibility)
        const unpaidMembers = members.filter(m => !m.has_paid);
        if (unpaidMembers.length > 0) {
            const confirmProceed = window.confirm(
                `${unpaidMembers.length} members haven't paid yet. Proceed anyway? (Leader will be responsible)`
            );
            if (!confirmProceed) return;
        }

        setIsProcessing(true);

        try {
            // 1. Create the Master Order
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .insert({
                    user_id: user!.id, // Leader places the order
                    payment_method: "upi", // Using UPI to represent prepaid/digital payment
                    delivery_mode: "room", // Delivered to leader's room
                    delivery_address: group.delivery_address,
                    subtotal: totalAmount,
                    delivery_fee: deliveryFee,
                    total: grandTotal,
                    notes: `Group Order: ${group.name} (${members.length} members) - PREPAID`,
                    status: "placed"
                } as any)
                .select()
                .single();

            if (orderError) throw orderError;

            // 2. Add All Items to Order Items
            const orderItems = items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                price: item.price
            }));

            await supabase.from("order_items").insert(orderItems);

            // 3. Update Group Status
            await supabase
                .from("group_orders" as any)
                .update({ status: "ordered" })
                .eq("id", group.id);

            toast.success("Group Order Placed Successfully! 🎉");
            navigate(`/orders/${order.id}`);

        } catch (error) {
            console.error("Failed to place group order:", error);
            toast.error("Failed to place order");
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-xl font-bold">Loading Checkout...</div>
            </div>
        );
    }

    if (!group || !currentMember) return null;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-6 max-w-4xl">
                <Button variant="ghost" onClick={() => navigate(`/group-order/${groupId}`)} className="mb-4">
                    <ArrowLeft size={18} className="mr-2" />
                    Back to Group
                </Button>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="md:col-span-2 space-y-6">

                        {/* Group Header */}
                        <Card className="neu-card border-lime">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <Badge className="bg-lime text-background mb-2">Group Checkout</Badge>
                                        <CardTitle className="text-2xl">{group.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <MapPin size={14} /> {group.delivery_address}
                                        </CardDescription>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Order Leader</p>
                                        <p className="font-bold">You</p>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>

                        {/* Payment Status */}
                        <Card className="neu-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Users size={18} /> Member Payments
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {members.map(member => {
                                        const memberTotal = items
                                            .filter(i => i.member_id === member.id)
                                            .reduce((s, i) => s + (i.price * i.quantity), 0) + deliveryPerPerson;

                                        return (
                                            <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${member.has_paid ? "bg-lime/20 text-lime" : "bg-red-500/10 text-red-500"}`}>
                                                        {member.has_paid ? <Check size={16} /> : <Clock size={16} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm">{member.profiles.full_name} {user?.id === member.user_id && "(You)"}</p>
                                                        <p className="text-xs text-muted-foreground">Share: ₹{memberTotal}</p>
                                                    </div>
                                                </div>
                                                <Badge variant={member.has_paid ? "default" : "outline"} className={member.has_paid ? "bg-lime text-background" : ""}>
                                                    {member.has_paid ? "PAID" : "PENDING"}
                                                </Badge>
                                            </div>
                                        );
                                    })}
                                </div>

                                {group.status !== "ordered" && isGroupCreator && (
                                    <div className="mt-4 bg-secondary/20 p-3 rounded-lg flex gap-3 text-sm">
                                        <AlertCircle size={18} className="text-secondary shrink-0 mt-0.5" />
                                        <p>As the leader, confirm everyone has paid before placing the final order. Unpaid shares may fall on you!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* My Payment */}
                        {!currentMember.has_paid && group.status !== "ordered" && (
                            <Card className="neu-card border-3 border-foreground">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Wallet size={20} /> Pay Your Share
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="p-4 bg-muted rounded-lg mb-4 flex justify-between items-center">
                                        <span>Total to Pay</span>
                                        <span className="text-2xl font-bold">₹{myTotal}</span>
                                    </div>

                                    <div className="space-y-3 mb-4">
                                        <div
                                            onClick={() => setPaymentMethod("razorpay")}
                                            className={`p-3 border-2 rounded-lg cursor-pointer flex justify-between items-center ${paymentMethod === "razorpay" ? "border-lime bg-lime/10" : "border-border"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <CreditCard size={18} />
                                                <span>Pay Online (UPI/Card)</span>
                                            </div>
                                            <Badge variant="secondary" className="text-[10px]">FASTEST</Badge>
                                        </div>

                                        <div
                                            onClick={() => setPaymentMethod("wallet")}
                                            className={`p-3 border-2 rounded-lg cursor-pointer flex justify-between items-center ${paymentMethod === "wallet" ? "border-lime bg-lime/10" : "border-border"}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Wallet size={18} />
                                                <span>Pay with Wallet</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-muted-foreground block">Balance: ₹{myWalletBalance}</span>
                                                {myWalletBalance < myTotal && <span className="text-xs text-red-500 font-bold">Insufficient</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handlePayment}
                                        disabled={isProcessing || (paymentMethod === "wallet" && myWalletBalance < myTotal)}
                                        className="w-full neu-btn bg-lime text-background font-bold py-6"
                                    >
                                        {isProcessing ? "Processing..." : `Pay ₹${myTotal}`}
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <Card className="neu-card">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg">Order Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Items Total</span>
                                        <span>₹{totalAmount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Group Delivery</span>
                                        <span>₹{deliveryFee}</span>
                                    </div>
                                    <Separator className="my-2" />
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Grand Total</span>
                                        <span>₹{grandTotal}</span>
                                    </div>
                                </div>

                                <ScrollArea className="h-64 pr-2">
                                    <div className="space-y-3">
                                        {items.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                                <div>
                                                    <p className="font-medium">{item.product_name}</p>
                                                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                                    {item.member_id === currentMember.id && <Badge variant="outline" className="text-[10px] mt-1">Yours</Badge>}
                                                </div>
                                                <span className="font-medium">₹{item.price * item.quantity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                        </Card>

                        {isGroupCreator && group.status !== "ordered" && (
                            <Button
                                onClick={placeGroupOrder}
                                disabled={isProcessing}
                                className="w-full neu-btn bg-background border-2 border-foreground hover:bg-lime hover:border-lime transition-all py-6 text-lg"
                            >
                                <ShoppingCart size={20} className="mr-2" />
                                {isProcessing ? "Placing Order..." : "Place Final Order"}
                            </Button>
                        )}

                        {group.status === "ordered" && (
                            <div className="neu-card bg-lime/20 p-6 text-center">
                                <Check size={48} className="mx-auto text-lime mb-2" />
                                <h3 className="font-bold text-lg">Order Placed!</h3>
                                <p className="text-sm text-muted-foreground">The order has been sent to the kitchen.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GroupCheckout;
