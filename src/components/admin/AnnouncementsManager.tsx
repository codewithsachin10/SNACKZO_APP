import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Send, Bell, Users, Truck, MessageSquare, AlertCircle, Check, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PREDEFINED_MESSAGES = [
    "🚧 Shop will be closed today for maintenance.",
    "🌧️ Heavy rain in the area. Delivery times may be delayed.",
    "🎉 Happy New Year! We are open until 4 AM today.",
    "⚡ High Demand! Orders may take 20-30 mins.",
    "📢 New Stock Arrived! Check out the latest snacks.",
    "🛑 Shop Closed. We will be back tomorrow at 8 PM.",
    "🍔 Food Court is now open for orders!",
    "🚀 Express Delivery is now available.",
    "🎁 Special Offer: Buy 1 Get 1 Free on selected items.",
    "🕒 Extended Hours: We are open late tonight!",
    "⚠️ Low Stock Alert: Hurry before your favorites run out.",
    "🍞 Fresh Bread has just arrived!"
];

interface UserProfile {
    user_id: string;
    full_name: string | null;
    phone: string | null;
    email?: string;
}

const AnnouncementsManager = () => {
    const [activeTab, setActiveTab] = useState<'broadcast' | 'targeted'>('broadcast');
    const [config, setConfig] = useState<any>(null);

    // Broadcast State
    const [announcementText, setAnnouncementText] = useState("");
    const [promoText, setPromoText] = useState("");
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Targeted Notification State
    const [targetType, setTargetType] = useState<'all' | 'runners' | 'users' | 'specific'>('all');
    const [notifTitle, setNotifTitle] = useState("");
    const [notifBody, setNotifBody] = useState("");
    const [isSending, setIsSending] = useState(false);

    // User Selection State
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [userSearch, setUserSearch] = useState("");
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        fetchConfig();
        fetchUsers();
    }, []);

    const fetchConfig = async () => {
        const { data } = await supabase.from('store_config' as any).select('*').single();
        if (data) {
            setConfig(data);
            setAnnouncementText((data as any).announcement_text || "");
            setPromoText((data as any).promo_text || "");
        }
    };

    const fetchUsers = async () => {
        setLoadingUsers(true);
        const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone')
            .order('created_at', { ascending: false });

        if (data) {
            setUsers(data as UserProfile[]);
        }
        setLoadingUsers(false);
    };

    const filteredUsers = useMemo(() => {
        if (!userSearch) return users;
        const lowerQ = userSearch.toLowerCase();
        return users.filter(u =>
            (u.full_name?.toLowerCase() || "").includes(lowerQ) ||
            (u.phone || "").includes(lowerQ)
        );
    }, [users, userSearch]);

    const handeBroadcastUpdate = async (type: 'announcement' | 'promo') => {
        if (!config) return;
        setIsBroadcasting(true);

        try {
            const updates: any = {};
            if (type === 'announcement') updates.announcement_text = announcementText;
            if (type === 'promo') updates.promo_text = promoText;

            const { error } = await supabase
                .from('store_config' as any)
                .update(updates)
                .eq('id', config.id);

            if (error) throw error;

            const message = type === 'announcement' ? announcementText : promoText;
            if (message) {
                await supabase.from('notifications' as any).insert({
                    title: type === 'announcement' ? '📢 Announcement' : '🔥 New Offer!',
                    body: message,
                    type: type,
                    target_user_id: null // Broadcast
                });
            }

            toast.success(`${type === 'announcement' ? 'Marquee' : 'Promo'} updated globally!`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update");
        } finally {
            setIsBroadcasting(false);
        }
    };

    const sendTargetedNotification = async () => {
        if (!notifTitle || !notifBody) {
            toast.error("Please enter a title and message");
            return;
        }

        if (targetType === 'specific' && selectedUserIds.length === 0) {
            toast.error("Please select at least one user");
            return;
        }

        setIsSending(true);
        try {
            let targets: string[] = [];

            if (targetType === 'all') {
                // 1. Insert into DB for History (Broadcast)
                const dbPromise = supabase.from('notifications' as any).insert({
                    title: notifTitle,
                    body: notifBody,
                    type: 'info',
                    target_user_id: null
                });

                // 2. Fetch all users with Push Subscriptions to send actual Push
                // Note: In production, this should be done via Edge Function batching.
                const { data: subs } = await supabase.from('push_subscriptions').select('user_id');
                const uniqueUsers = Array.from(new Set(subs?.map(s => s.user_id) || []));

                // 3. Send Pushes
                const pushPromises = uniqueUsers.map(uid =>
                    supabase.functions.invoke('send-push-notification', {
                        body: { userId: uid, title: notifTitle, body: notifBody, url: '/' }
                    })
                );

                const responses = await Promise.all(pushPromises);

                let successCount = 0;
                let failureCount = 0;

                responses.forEach((res) => {
                    if (res.error) {
                        console.error("Push Function Error:", res.error);
                        failureCount++;
                    } else if (res.data?.error) {
                        // Function executed but returned an error payload
                        console.error("Push Function Logic Error:", res.data.error);
                        failureCount++;
                    } else {
                        successCount++;
                    }
                });

                if (failureCount > 0) {
                    toast.warning(`Attempted ${uniqueUsers.length} sends. Success: ${successCount}. Failed: ${failureCount}. Check console for details.`);
                } else {
                    toast.success(`Broadcasted successfully to ${successCount} devices!`);
                }

                setNotifTitle("");
                setNotifBody("");
                setIsSending(false);
                return;
            }

            if (targetType === 'specific') {
                targets = [...selectedUserIds];
            } else if (targetType === 'runners') {
                const { data: runnerUsers } = await supabase.from('user_roles').select('user_id').eq('role', 'runner' as any);
                if (runnerUsers) targets = runnerUsers.map(r => r.user_id);
            } else if (targetType === 'users') {
                const { data: customers } = await supabase.from('user_roles').select('user_id').eq('role', 'customer' as any);
                if (customers) targets = customers.map(r => r.user_id);
            }

            if (targets.length === 0 && targetType !== 'all') {
                toast.error("No users found for this target group.");
                setIsSending(false);
                return;
            }

            // 1. Send Push Notifications (Edge Function)
            // We do this in the background or await it? Await to confirm.
            const pushPromises = targets.map(uid =>
                supabase.functions.invoke('send-push-notification', {
                    body: {
                        userId: uid,
                        title: notifTitle,
                        body: notifBody,
                        url: '/' // Open app home
                    }
                })
            );

            // 2. Insert into DB for In-App History
            const notifications = targets.map(uid => ({
                title: notifTitle,
                body: notifBody,
                type: 'info',
                target_user_id: uid
            }));

            // Execute both
            const [pushResults, dbError] = await Promise.all([
                Promise.all(pushPromises),
                supabase.from('notifications' as any).insert(notifications)
            ]);

            if (dbError[1] && dbError[1].error) throw dbError[1].error;

            toast.success(`Sent to ${targets.length} users!`);
            setNotifTitle("");
            setNotifBody("");
            setSelectedUserIds([]); // Clear selection after sending
        } catch (error) {
            console.error(error);
            toast.error("Failed to send notification");
        } finally {
            setIsSending(false);
        }
    };

    const useTemplate = (text: string) => {
        setNotifBody(text);
        setNotifTitle("Important Update");
    };

    const toggleUserSelection = (userId: string) => {
        if (selectedUserIds.includes(userId)) {
            setSelectedUserIds(selectedUserIds.filter(id => id !== userId));
        } else {
            setSelectedUserIds([...selectedUserIds, userId]);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-4 mb-4">
                <button
                    onClick={() => setActiveTab('broadcast')}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${activeTab === 'broadcast'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent glass-card"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Bell size={20} />
                        Global Announcements (Marquee)
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('targeted')}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${activeTab === 'targeted'
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-transparent glass-card"
                        }`}
                >
                    <div className="flex items-center justify-center gap-2">
                        <Bell size={20} />
                        Push Notifications
                    </div>
                </button>
            </div>

            {activeTab === 'broadcast' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="glass-card p-6 border-l-4 border-primary">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                            <Bell size={20} className="text-primary" />
                            Marquee Announcement
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">This text scrolls at the top of the app for all users.</p>

                        <div className="flex gap-3">
                            <input
                                value={announcementText}
                                onChange={(e) => setAnnouncementText(e.target.value)}
                                placeholder="e.g. Shop closes early today at 10 PM!"
                                className="flex-1 glass-card px-4 py-3 border-primary/20 focus:border-primary transition-colors"
                                disabled={isBroadcasting}
                            />
                            <button
                                onClick={() => handeBroadcastUpdate('announcement')}
                                disabled={isBroadcasting}
                                className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold hover:brightness-110 flex items-center gap-2 whitespace-nowrap"
                            >
                                <div className="bg-white/20 p-1 rounded-full"><Send size={14} /></div>
                                Update
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-6 border-l-4 border-accent">
                        <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                            <AlertCircle size={20} className="text-accent" />
                            Promo Banner Text
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">Highlighted text often used for critical updates or big offers.</p>

                        <div className="flex gap-3">
                            <input
                                value={promoText}
                                onChange={(e) => setPromoText(e.target.value)}
                                placeholder="e.g. Flat 50% OFF on all orders > ₹500"
                                className="flex-1 glass-card px-4 py-3 border-accent/20 focus:border-accent transition-colors"
                                disabled={isBroadcasting}
                            />
                            <button
                                onClick={() => handeBroadcastUpdate('promo')}
                                disabled={isBroadcasting}
                                className="bg-accent text-accent-foreground px-6 py-2 rounded-xl font-bold hover:brightness-110 flex items-center gap-2 whitespace-nowrap"
                            >
                                <div className="bg-white/20 p-1 rounded-full"><Send size={14} /></div>
                                Update
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'targeted' && (
                <div className="grid lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2">
                    {/* Use Template */}
                    <div className="glass-card p-6 h-fit">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <MessageSquare size={18} /> Predefined Templates
                        </h3>
                        <div className="grid grid-cols-1 gap-2 max-h-[500px] overflow-auto pr-2">
                            {PREDEFINED_MESSAGES.map((msg, i) => (
                                <button
                                    key={i}
                                    onClick={() => useTemplate(msg)}
                                    className="text-left p-3 rounded-lg glass-card hover:bg-muted/50 text-sm transition-colors flex items-center gap-2 group"
                                >
                                    <span className="text-primary group-hover:scale-125 transition-transform">•</span> {msg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Composer */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Send size={18} /> Compose Notification
                        </h3>

                        <div className="space-y-4">
                            {/* Target Selector */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <button
                                    onClick={() => setTargetType('all')}
                                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${targetType === 'all' ? 'bg-primary/20 border-primary text-primary' : 'border-border hover:bg-muted'}`}
                                >
                                    <Users size={14} className="inline mr-1" /> Everyone
                                </button>
                                <button
                                    onClick={() => setTargetType('runners')}
                                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${targetType === 'runners' ? 'bg-accent/20 border-accent text-accent' : 'border-border hover:bg-muted'}`}
                                >
                                    <Truck size={14} className="inline mr-1" /> Runners
                                </button>
                                <button
                                    onClick={() => setTargetType('specific')}
                                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${targetType === 'specific' ? 'bg-secondary/20 border-secondary text-secondary' : 'border-border hover:bg-muted'}`}
                                >
                                    <Check size={14} className="inline mr-1" /> Select Users
                                </button>
                            </div>

                            {/* User Selection UI */}
                            {targetType === 'specific' && (
                                <div className="border border-border rounded-xl p-3 mb-4 bg-background/50">
                                    <div className="relative mb-2">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                            placeholder="Search users by name or phone..."
                                            className="w-full glass-card pl-8 pr-3 py-1.5 text-sm"
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1">
                                        {loadingUsers ? (
                                            <p className="text-xs text-muted-foreground text-center py-2">Loading users...</p>
                                        ) : filteredUsers.length > 0 ? (
                                            filteredUsers.map(u => (
                                                <div
                                                    key={u.user_id}
                                                    onClick={() => toggleUserSelection(u.user_id)}
                                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-sm transition-colors ${selectedUserIds.includes(u.user_id)
                                                        ? "bg-secondary/20 border border-secondary/30"
                                                        : "hover:bg-muted"
                                                        }`}
                                                >
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUserIds.includes(u.user_id)
                                                        ? "bg-secondary border-secondary text-secondary-foreground"
                                                        : "border-muted-foreground"
                                                        }`}>
                                                        {selectedUserIds.includes(u.user_id) && <Check size={10} />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold">{u.full_name || "Unknown User"}</p>
                                                        <p className="text-xs text-muted-foreground">{u.phone || "No Phone"}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-muted-foreground text-center py-2">No users found.</p>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs text-right text-muted-foreground">
                                        {selectedUserIds.length} users selected
                                    </div>
                                </div>
                            )}

                            <input
                                value={notifTitle}
                                onChange={e => setNotifTitle(e.target.value)}
                                placeholder="Notification Title (e.g. Shop Update)"
                                className="w-full glass-card p-3 font-bold"
                            />

                            <textarea
                                value={notifBody}
                                onChange={e => setNotifBody(e.target.value)}
                                placeholder="Type your message here..."
                                className="w-full glass-card p-3 min-h-[100px] resize-none"
                            />

                            <button
                                onClick={sendTargetedNotification}
                                disabled={isSending}
                                className="w-full neon-btn bg-lime text-lime-foreground py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isSending ? "Sending..." : "Send Notification"} <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementsManager;
