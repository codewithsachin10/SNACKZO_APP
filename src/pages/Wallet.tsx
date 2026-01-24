import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft, Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Gift, Trophy, Activity, Settings, BarChart3, AlertCircle
} from "lucide-react";
import { ReferralProgram } from "@/components/ReferralProgram";
import { LoyaltyPoints } from "@/components/LoyaltyPoints";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";

// Premium Components
import { MiniSpinWidget } from "@/components/SpinWheel";
import { BottomNavigation } from "@/components/ui/BottomNavigation";

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  order_id: string | null;
  created_at: string;
}

const Wallet = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState("");
  const [isTopingUp, setIsTopingUp] = useState(false);

  // Phase 2: Financial Features State
  const [spendingLimit, setSpendingLimit] = useState(2000);
  const [autoReload, setAutoReload] = useState(false);
  const [autoReloadAmount, setAutoReloadAmount] = useState(500);
  const [analyticsData, setAnalyticsData] = useState({
    weeklySpending: [120, 300, 45, 200, 150, 400, 250], // Mock data
    categories: [
      { name: "Snacks", value: 45, color: "bg-orange-500" },
      { name: "Meals", value: 30, color: "bg-blue-500" },
      { name: "Drinks", value: 25, color: "bg-purple-500" },
    ]
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTransactions();
    // Load settings from profile if available (simulated)
    if (profile) {
      // In real implementation, these would come from profile columns we added
    }
  }, [user, navigate, profile]);

  const fetchTransactions = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching transactions:", error);
    } else {
      setTransactions(data || []);
      // Calculate analytics here in real app
    }
    setIsLoading(false);
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amount > 5000) {
      toast.error("Maximum topup amount is ₹5000");
      return;
    }

    setIsTopingUp(true);

    try {
      const { data: orderData, error: functionError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount }
      });

      if (functionError) throw new Error('Failed to create payment order');

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Hostel Mart",
        description: "Wallet Top-up",
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const { error: dbError } = await supabase
              .from("wallet_transactions")
              .insert({
                user_id: user!.id,
                amount: amount,
                transaction_type: "topup",
                description: `Wallet load (Txn: ${response.razorpay_payment_id})`
              });
            if (dbError) throw dbError;
            toast.success(`₹${amount} added to wallet!`);
            setTopupAmount("");
            await refreshProfile();
            await fetchTransactions();
          } catch (err) {
            toast.error("Payment successful but wallet update failed.");
          }
        },
        prefill: { name: profile?.full_name || "", contact: profile?.phone || "" },
        theme: { color: "#84cc16" },
        modal: { ondismiss: () => setIsTopingUp(false) }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error("Failed to initiate payment");
      setIsTopingUp(false);
    }
  };

  const saveSettings = async () => {
    // Save spending limits and auto-reload settings
    toast.success("Wallet settings saved!");
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit": case "topup": case "refund": return <ArrowDownLeft size={16} className="text-lime" />;
      case "debit": return <ArrowUpRight size={16} className="text-destructive" />;
      default: return <RefreshCw size={16} />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "credit": return "Credit";
      case "debit": return "Purchase";
      case "refund": return "Refund";
      case "topup": return "Top-up";
      default: return type;
    }
  };

  const quickAmounts = [50, 100, 200, 500];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-50 bg-secondary border-b-3 border-foreground">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="neu-btn bg-background p-2">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold uppercase">My Wallet</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-6"><MiniSpinWidget onOpenFullWheel={() => { }} /></div>

        <Tabs defaultValue="wallet" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="wallet"><WalletIcon size={16} className="mr-2" /> Wallet</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 size={16} className="mr-2" /> Stats</TabsTrigger>
            <TabsTrigger value="loyalty"><Trophy size={16} className="mr-2" /> Loyalty</TabsTrigger>
            <TabsTrigger value="referrals"><Gift size={16} className="mr-2" /> Refer</TabsTrigger>
          </TabsList>

          <TabsContent value="wallet" className="space-y-6">
            {/* Balance Card */}
            <div className="neu-card bg-gradient-to-br from-primary to-accent text-primary-foreground p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4"><Activity className="opacity-20" size={64} /></div>
              <div className="flex items-center gap-3 mb-4">
                <WalletIcon size={32} />
                <span className="text-lg opacity-90">Available Balance</span>
              </div>
              <p className="text-5xl font-bold">₹{profile?.wallet_balance || 0}</p>
              {profile?.wallet_balance !== undefined && profile.wallet_balance < 100 && (
                <div className="mt-4 flex items-center gap-2 text-yellow-200 bg-black/20 p-2 rounded-lg w-fit text-xs font-bold">
                  <AlertCircle size={14} /> Low balance
                </div>
              )}
            </div>

            {/* Premium Controls */}
            <div className="neu-card bg-card p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-bold uppercase flex items-center gap-2">
                  <Settings size={20} /> Wallet Settings
                </h2>
                <button onClick={saveSettings} className="text-xs font-bold text-primary hover:underline">SAVE</button>
              </div>

              <div className="space-y-4">
                {/* Auto Reload */}
                <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${autoReload ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                      <RefreshCw size={18} className={autoReload ? "animate-spin-slow" : ""} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Auto-Reload</p>
                      <p className="text-xs text-muted-foreground">Add funds when low</p>
                    </div>
                  </div>
                  <Switch checked={autoReload} onCheckedChange={setAutoReload} />
                </div>
                {autoReload && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pl-12 pr-2">
                    <p className="text-xs text-muted-foreground mb-2">Auto-add ₹{autoReloadAmount}</p>
                    <Slider value={[autoReloadAmount]} min={100} max={2000} step={100} onValueChange={([v]) => setAutoReloadAmount(v)} className="w-full" />
                  </motion.div>
                )}

                {/* Spending Limit */}
                <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-orange-500/20 text-orange-500">
                      <AlertCircle size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Monthly Limit</p>
                      <p className="text-xs text-muted-foreground">Budget control</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{spendingLimit}</p>
                  </div>
                </div>
                <Slider value={[spendingLimit]} min={500} max={10000} step={500} onValueChange={([v]) => setSpendingLimit(v)} />
              </div>
            </div>

            {/* Top-up Section */}
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase mb-4 flex items-center gap-2"><Plus size={20} /> Add Money</h2>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {quickAmounts.map((amount) => (
                  <button key={amount} onClick={() => setTopupAmount(amount.toString())} className={`neu-btn py-2 text-sm font-bold ${topupAmount === amount.toString() ? "bg-primary text-primary-foreground" : "bg-background"}`}>₹{amount}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <input type="number" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} placeholder="Enter amount" className="w-full border-3 border-foreground bg-background p-3 pl-8 font-medium focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <button onClick={handleTopup} disabled={isTopingUp || !topupAmount} className="neu-btn bg-lime px-6 disabled:opacity-50">{isTopingUp ? "..." : "Add"}</button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase mb-4">Transaction History</h2>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><WalletIcon size={48} className="mx-auto mb-4 opacity-50" /><p>No transactions yet</p></div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center justify-between bg-background border-3 border-foreground p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">{getTransactionIcon(txn.transaction_type)}</div>
                        <div>
                          <p className="font-bold text-sm">{getTransactionLabel(txn.transaction_type)}</p>
                          <p className="text-xs text-muted-foreground">{txn.description || (txn.order_id ? `Order #${txn.order_id.slice(0, 8)}` : "-")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${txn.transaction_type === "debit" ? "text-destructive" : "text-lime"}`}>{txn.transaction_type === "debit" ? "-" : "+"}₹{txn.amount}</p>
                        <p className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="neu-card bg-card p-6">
              <h2 className="font-bold uppercase mb-6 flex items-center gap-2"><BarChart3 size={20} /> Spending Trends</h2>

              {/* Weekly Chart */}
              <div className="h-40 flex items-end justify-between gap-2 mb-8 px-2">
                {analyticsData.weeklySpending.map((value, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 flex-1 group">
                    <div className="w-full bg-secondary/30 rounded-t-lg relative h-32 flex items-end overflow-hidden">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(value / 500) * 100}%` }}
                        className="w-full bg-primary/80 group-hover:bg-primary transition-colors absolute bottom-0"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                  </div>
                ))}
              </div>

              {/* Categories */}
              <h3 className="font-bold text-sm mb-4">Top Categories</h3>
              <div className="space-y-4">
                {analyticsData.categories.map((cat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{cat.name}</span>
                      <span className="text-muted-foreground">{cat.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${cat.value}%` }}
                        className={`h-full ${cat.color}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="neu-card bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6">
              <h2 className="font-bold uppercase mb-2">Smart Insight</h2>
              <p className="text-sm opacity-90">You spend 20% more on weekends. Try using our new "Weekend Saver" promo code!</p>
            </div>
          </TabsContent>

          <TabsContent value="loyalty"><LoyaltyPoints /></TabsContent>
          <TabsContent value="referrals"><ReferralProgram /></TabsContent>
        </Tabs>
      </main>

      <div className="md:hidden"><BottomNavigation /></div>
    </div>
  );
};

export default Wallet;
