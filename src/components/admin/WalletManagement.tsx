import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Search, Plus, RefreshCw } from "lucide-react";

interface UserWithWallet {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  wallet_balance: number;
}

const WalletManagement = () => {
  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithWallet | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");
  const [isCrediting, setIsCrediting] = useState(false);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      toast.error("Enter a search term");
      return;
    }

    setIsLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, wallet_balance")
      .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(20);

    if (error) {
      toast.error("Search failed");
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  const handleCredit = async () => {
    if (!selectedUser) return;

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (!creditReason.trim()) {
      toast.error("Enter a reason for the credit");
      return;
    }

    setIsCrediting(true);

    try {
      const { error } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: selectedUser.user_id,
          amount: amount,
          transaction_type: "credit",
          description: creditReason
        });

      if (error) throw error;

      toast.success(`₹${amount} credited to ${selectedUser.full_name || "user"}`);
      setSelectedUser(null);
      setCreditAmount("");
      setCreditReason("");

      // Refresh user list
      if (searchQuery) {
        searchUsers();
      }
    } catch (error) {
      console.error("Credit error:", error);
      toast.error("Failed to credit wallet");
    } finally {
      setIsCrediting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchUsers()}
            placeholder="Search by name or phone..."
            className="w-full glass-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>
        <button
          onClick={searchUsers}
          disabled={isLoading}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? <RefreshCw size={18} className="animate-spin" /> : "Search users"}
        </button>
      </div>

      {/* User List */}
      {users.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider ml-1">
            {users.length} Result{users.length !== 1 && 's'} Found
          </h3>
          <div className="grid gap-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="glass-card p-4 flex items-center justify-between hover:bg-muted/5 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold">
                    {user.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <p className="font-bold">{user.full_name || "Unknown User"}</p>
                    <p className="text-sm text-muted-foreground">{user.phone || "No phone linked"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance</p>
                    <p className="font-bold text-lg text-lime">₹{user.wallet_balance}</p>
                  </div>
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-xl transition-all active:scale-95"
                    title="Add Credit"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div
            className="bg-card w-full max-w-md rounded-2xl border border-border/50 shadow-2xl p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <div className="p-2 bg-lime/10 rounded-lg text-lime">
                  <Wallet size={20} />
                </div>
                Credit Wallet
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                {/* Close icon could go here if imported, relying on Cancel button below */}
              </button>
            </div>

            <div className="bg-muted/30 rounded-xl p-4 mb-6 flex items-center justify-between border border-border/50">
              <div>
                <p className="font-bold">{selectedUser.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current Balance</p>
                <p className="font-bold text-lime text-lg">₹{selectedUser.wallet_balance}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Amount to Credit</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                  <input
                    type="number"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-muted/30 border border-input rounded-xl p-3 pl-8 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 ml-1">Reason / Description</label>
                <input
                  type="text"
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="e.g., Promotional Bonus, refund..."
                  className="w-full bg-muted/30 border border-input rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-2.5 rounded-xl font-medium hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCredit}
                  disabled={isCrediting || !creditAmount || !creditReason}
                  className="flex-1 bg-lime text-lime-foreground py-2.5 rounded-xl font-bold hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-lime/20"
                >
                  {isCrediting ? "Processing..." : "Confirm Credit"}
                </button>
              </div>
            </div>
          </div>
          {/* Backdrop click to close */}
          <div className="absolute inset-0 -z-10" onClick={() => setSelectedUser(null)} />
        </div>
      )}

      {/* Empty State */}
      {users.length === 0 && searchQuery && !isLoading && (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mb-4">
            <Search size={32} className="text-muted-foreground/50" />
          </div>
          <h3 className="font-bold text-lg">No users found</h3>
          <p className="text-muted-foreground">Try searching with a different name or phone number</p>
        </div>
      )}

      {!searchQuery && (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-2">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Search size={32} className="text-primary" />
          </div>
          <h3 className="font-bold text-lg">Find a user</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mt-2">
            Search by name or phone number to manage their wallet balance and view history.
          </p>
        </div>
      )}
    </div>
  );
};

export default WalletManagement;
