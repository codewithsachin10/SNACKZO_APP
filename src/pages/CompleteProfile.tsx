import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Building, DoorOpen, Phone, ArrowRight } from "lucide-react";

const CompleteProfile = () => {
  const { user, profile, updateProfile, isLoading } = useAuth();
  const navigate = useNavigate();
  const [deliveryArea, setDeliveryArea] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }

    if (profile?.hostel_block && profile?.room_number) {
      navigate("/");
    }
  }, [user, profile, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deliveryArea || !houseNo) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);

    const { error } = await updateProfile({
      hostel_block: deliveryArea,
      room_number: houseNo,
      phone: phone || null
    });

    if (error) {
      toast.error("Failed to save profile. Please try again.");
    } else {
      toast.success("Profile complete! Let's get you some goodies!");
      navigate("/");
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl font-bold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-5 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 20px,
              hsl(var(--foreground)) 20px,
              hsl(var(--foreground)) 22px
            )`,
          }}
        />
      </div>

      <div className="w-full max-w-md relative">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-accent border-3 border-foreground px-4 py-2 shadow-neu mb-4">
            <span className="font-bold uppercase text-sm">Almost There!</span>
          </div>
          <h1 className="text-3xl font-bold uppercase mb-2">
            Where Do We Deliver?
          </h1>
          <p className="text-muted-foreground font-medium">
            Tell us your address for quick delivery
          </p>
        </div>

        {/* Form Card */}
        <div className="neu-card bg-card p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Delivery Area / Locality <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  value={deliveryArea}
                  onChange={(e) => setDeliveryArea(e.target.value)}
                  className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., HSR Layout, Indiranagar"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                House / Apartment / Plot No. <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <DoorOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="text"
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., #123, 4th Floor"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase mb-2">
                Phone Number <span className="text-muted-foreground text-xs">(Optional)</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border-3 border-foreground bg-background p-3 pl-10 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="bg-secondary border-3 border-foreground p-4 mt-4">
              <p className="text-sm font-medium">
                💡 <strong>Express Delivery:</strong> We deliver to your doorstep in minutes!
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="neu-btn bg-lime w-full py-4 text-lg flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  Start Ordering
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
