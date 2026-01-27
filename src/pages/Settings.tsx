import { useNavigate } from "react-router-dom";
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Smartphone, ArrowLeft, CreditCard, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

import { useTheme } from "@/components/ThemeProvider";

const Settings = () => {
    const navigate = useNavigate();
    const { signOut, profile } = useAuth();
    const { theme, setTheme } = useTheme();

    const handleLogout = async () => {
        await signOut();
        navigate("/auth");
        toast.success("Logged out successfully");
    };

    const toggleTheme = (checked: boolean) => {
        setTheme(checked ? "dark" : "light");
    };

    const SettingItem = ({ icon: Icon, title, subtitle, onClick, hasArrow = true, danger = false }: any) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 glass-card hover:bg-muted/50 transition-colors ${danger ? 'text-destructive hover:bg-destructive/10 border-destructive/30' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl ${danger ? 'bg-destructive/20' : 'bg-primary/10'}`}>
                    <Icon className={danger ? "text-destructive" : "text-primary"} size={20} />
                </div>
                <div className="text-left">
                    <h3 className={`font-semibold ${danger ? 'text-destructive' : 'text-foreground'}`}>{title}</h3>
                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
            </div>
            {hasArrow && <ChevronRight className="text-muted-foreground" size={18} />}
        </button>
    );

    return (
        <div className="min-h-screen bg-background pb-20">
            <Navbar /> {/* Assuming Navbar fits here, or make it standalone header */}

            <main className="container mx-auto px-4 pt-28 pb-24 max-w-2xl space-y-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>

                <div className="mb-6">
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-muted-foreground">Manage your app preferences</p>
                </div>

                {/* Account Section */}
                <section>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Account</h2>
                    <div className="space-y-3">
                        <SettingItem
                            icon={User}
                            title="Edit Profile"
                            subtitle="Name, Phone, Address"
                            onClick={() => navigate("/profile")}
                        />
                        <SettingItem
                            icon={Wallet}
                            title="Wallet & Referrals"
                            subtitle={`Balance: ₹${profile?.wallet_balance || 0}`}
                            onClick={() => navigate("/wallet")}
                        />
                        <SettingItem
                            icon={Shield}
                            title="Privacy & Security"
                            subtitle="Password, 2FA, Sessions"
                            onClick={() => navigate("/privacy-security")}
                        />
                        <SettingItem
                            icon={CreditCard}
                            title="Payment Methods"
                            subtitle="Saved cards, One-click checkout"
                            onClick={() => navigate("/payment-methods")}
                        />
                    </div>
                </section>

                {/* Preferences */}
                <section>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Preferences</h2>
                    <div className="space-y-3">
                        <SettingItem
                            icon={Bell}
                            title="Notifications"
                            subtitle="Push, SMS, Email"
                            onClick={() => navigate("/settings/notifications")}
                        />
                        {/* Simple toggle example */}
                        <div className="flex items-center justify-between p-4 glass-card">
                            <div className="flex items-center gap-4">
                                <div className="p-2 rounded-xl bg-primary/10">
                                    <Moon className="text-primary" size={20} />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold">Dark Mode</h3>
                                    <p className="text-xs text-muted-foreground">{theme === 'dark' ? 'Midnight Neon Active' : 'Daytime Hustle Active'}</p>
                                </div>
                            </div>
                            <Switch
                                checked={theme === 'dark'}
                                onCheckedChange={toggleTheme}
                            />
                        </div>
                    </div>
                </section>

                {/* Support */}
                <section>
                    <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 ml-1">Support</h2>
                    <div className="space-y-3">
                        <SettingItem
                            icon={HelpCircle}
                            title="Help & Support"
                            subtitle="FAQs, Contact Us"
                            onClick={() => navigate("/support")}
                        />
                        <SettingItem
                            icon={Smartphone}
                            title="App Version"
                            subtitle="v1.2.0 (Beta)"
                            hasArrow={false}
                            onClick={() => { }}
                        />
                    </div>
                </section>

                {/* Logout */}
                <section>
                    <SettingItem
                        icon={LogOut}
                        title="Log Out"
                        danger={true}
                        hasArrow={false}
                        onClick={handleLogout}
                    />
                </section>

            </main>
        </div>
    );
};

export default Settings;
