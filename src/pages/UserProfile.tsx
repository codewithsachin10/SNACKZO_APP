import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
// import { useFeatures } from "@/contexts/FeatureContext"; // Temporarily disabled
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { User, Phone, MapPin, LogOut, ArrowLeft, Save, Building, DoorOpen, Trophy, Share2 } from "lucide-react";

// Premium Components
import { AchievementMiniDisplay } from "@/components/AchievementDisplay";
import { ReferralShareCard } from "@/components/SocialSharing";
import { BottomNavigation } from "@/components/ui/BottomNavigation";

// Use local state for address instead of fixed blocks

const UserProfile = () => {
    const { user, profile, isLoading, updateProfile, signOut } = useAuth();
    // Feature flags - default to enabled since FeatureProvider is disabled
    const isFeatureEnabled = (feature: string) => true;
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "",
        phone: "",
        hostel_block: "",
        room_number: ""
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                full_name: profile.full_name || "",
                phone: profile.phone || "",
                hostel_block: profile.hostel_block || "",
                room_number: profile.room_number || ""
            });
        }
    }, [profile]);

    const handleSave = async () => {
        setIsSaving(true);
        const { error } = await updateProfile({
            full_name: formData.full_name,
            phone: formData.phone,
            hostel_block: formData.hostel_block,
            room_number: formData.room_number
        });

        if (error) {
            toast.error("Failed to update profile");
        } else {
            toast.success("Profile updated successfully!");
        }
        setIsSaving(false);
    };

    const handleLogout = async () => {
        await signOut();
        navigate("/auth");
    };

    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
                <div className="container mx-auto px-4 py-4 flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-muted rounded-full">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">My Profile</h1>
                </div>
            </header>

            <main className="container mx-auto px-4 py-6 max-w-md">
                {/* Avatar Section */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-4xl mb-4 border-4 border-background shadow-xl">
                        {profile?.full_name ? profile.full_name[0].toUpperCase() : <User size={40} />}
                    </div>
                    <h2 className="text-2xl font-bold">{profile?.full_name || "User"}</h2>
                    <p className="text-muted-foreground text-sm">{user?.email}</p>
                </div>

                {/* Achievements Mini Display */}
                {isFeatureEnabled('achievements') && (
                    <div className="mb-6">
                        <AchievementMiniDisplay />
                    </div>
                )}

                {/* Referral Share Card */}
                {isFeatureEnabled('referral_program') && (
                    <div className="mb-6">
                        <ReferralShareCard
                            referralCode={profile?.id?.slice(0, 8).toUpperCase() || "SNACKZO"}
                            referralUrl={window.location.origin}
                        />
                    </div>
                )}

                {/* Edit Form */}
                <div className="space-y-6">
                    <div className="glass-card p-6 space-y-4">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <User size={18} className="text-primary" /> Personal Details
                        </h3>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Full Name</label>
                            <input
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full bg-muted/50 border border-border rounded-lg px-4 py-3 focus:border-primary focus:outline-none"
                                placeholder="Your Name"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Phone Number</label>
                            <div className="relative">
                                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    type="tel"
                                    className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                                    placeholder="+91 99999 99999"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <MapPin size={18} className="text-secondary" /> Delivery Address
                        </h3>

                        <div>
                            <label className="text-sm font-medium mb-1 block">Delivery Area / Locality</label>
                            <div className="relative">
                                <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={formData.hostel_block}
                                    onChange={(e) => setFormData({ ...formData, hostel_block: e.target.value })}
                                    className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                                    placeholder="Ex: HSR Layout, Sector 7"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1 block">House / Apartment / Plot No.</label>
                            <div className="relative">
                                <DoorOpen size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={formData.room_number}
                                    onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                                    className="w-full bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-3 focus:border-primary focus:outline-none"
                                    placeholder="Ex: #123, 4th Floor"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full neon-btn bg-primary text-primary-foreground py-4 flex items-center justify-center gap-2"
                    >
                        {isSaving ? "Saving..." : <><Save size={18} /> Save Changes</>}
                    </button>

                    <button
                        onClick={handleLogout}
                        className="w-full py-4 text-destructive font-medium flex items-center justify-center gap-2 hover:bg-destructive/10 rounded-xl transition-colors"
                    >
                        <LogOut size={18} /> Sign Out
                    </button>
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden">
                <BottomNavigation />
            </div>
        </div>
    );
};

export default UserProfile;
