import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, Copy, Check, Twitter, Facebook, MessageCircle,
  Link, Image, QrCode, X, Download, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface SocialSharingProps {
  type: "product" | "referral" | "achievement";
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  referralCode?: string;
  onShare?: (platform: string) => void;
}

export function SocialSharing({
  type,
  title,
  description,
  imageUrl,
  url,
  referralCode,
  onShare
}: SocialSharingProps) {
  const { toast } = useToast();
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const shareText = type === "referral"
    ? `🎉 Use my code ${referralCode} to get ₹50 off your first order on Snackzo! ${shareUrl}`
    : type === "achievement"
      ? `🏆 I just earned the "${title}" badge on Snackzo! ${description || ""}`
      : `Check out ${title} on Snackzo! ${shareUrl}`;

  const platforms = [
    {
      id: "whatsapp",
      name: "WhatsApp",
      icon: MessageCircle,
      color: "#25D366",
      url: `https://wa.me/?text=${encodeURIComponent(shareText)}`
    },
    {
      id: "twitter",
      name: "Twitter",
      icon: Twitter,
      color: "#1DA1F2",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`
    },
    {
      id: "facebook",
      name: "Facebook",
      icon: Facebook,
      color: "#1877F2",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`
    }
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(type === "referral" ? referralCode || shareUrl : shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: type === "referral" ? "Referral code copied to clipboard" : "Link copied to clipboard"
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description || shareText,
          url: shareUrl
        });
        onShare?.("native");
      } catch (err) {
        // User cancelled or share failed
      }
    } else {
      setShowShareMenu(true);
    }
  };

  const shareToplatform = (platform: typeof platforms[0]) => {
    window.open(platform.url, "_blank", "width=600,height=400");
    onShare?.(platform.id);
    setShowShareMenu(false);
  };

  return (
    <>
      {/* Share button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={shareNative}
        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-medium hover:bg-primary/20 transition-colors"
      >
        <Share2 size={18} />
        Share
      </motion.button>

      {/* Share menu */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4 sm:items-center"
            onClick={() => setShowShareMenu(false)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Share</h3>
                <button
                  onClick={() => setShowShareMenu(false)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Preview card */}
              {(title || imageUrl) && (
                <div className="flex gap-3 p-3 bg-muted/50 rounded-xl mb-6">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{title}</p>
                    {description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Referral code display */}
              {type === "referral" && referralCode && (
                <div className="mb-6">
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Your referral code
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 bg-muted rounded-xl font-mono text-lg font-bold text-center">
                      {referralCode}
                    </div>
                    <button
                      onClick={copyLink}
                      className={cn(
                        "p-3 rounded-xl transition-colors",
                        copied ? "bg-green-500 text-white" : "bg-muted hover:bg-muted/80"
                      )}
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Social platforms */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => shareToplatform(platform)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: platform.color }}
                    >
                      <platform.icon size={24} className="text-white" />
                    </div>
                    <span className="text-sm">{platform.name}</span>
                  </button>
                ))}
              </div>

              {/* Additional options */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={copyLink}
                  className="flex items-center justify-center gap-2 p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
                >
                  {copied ? <Check size={18} /> : <Link size={18} />}
                  <span className="text-sm font-medium">
                    {copied ? "Copied!" : "Copy Link"}
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowShareMenu(false);
                    setShowQR(true);
                  }}
                  className="flex items-center justify-center gap-2 p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors"
                >
                  <QrCode size={18} />
                  <span className="text-sm font-medium">QR Code</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-2xl p-6 max-w-xs w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-bold text-lg mb-4">Scan QR Code</h3>

              {/* QR Code placeholder - in production use a QR library */}
              <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl mb-4">
                <div className="w-full h-full border-2 border-dashed border-muted flex items-center justify-center">
                  <QrCode size={80} className="text-muted-foreground" />
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                {type === "referral"
                  ? `Code: ${referralCode}`
                  : "Scan to open this link"
                }
              </p>

              <button
                onClick={() => setShowQR(false)}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================
// SHARE PRODUCT BUTTON (Inline)
// ============================================

interface ShareProductButtonProps {
  productName: string;
  productUrl: string;
  productImage?: string;
  variant?: "icon" | "button";
}

export function ShareProductButton({
  productName,
  productUrl,
  productImage,
  variant = "icon"
}: ShareProductButtonProps) {
  const { toast } = useToast();

  const shareProduct = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: productName,
          text: `Check out ${productName} on Snackzo!`,
          url: productUrl
        });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(productUrl);
      toast({
        title: "Link copied!",
        description: "Share it with your friends"
      });
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={shareProduct}
        className="p-2 rounded-full hover:bg-muted transition-colors"
      >
        <Share2 size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={shareProduct}
      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-muted/80 transition-colors"
    >
      <Share2 size={14} />
      Share
    </button>
  );
}

// ============================================
// REFERRAL SHARE CARD
// ============================================

interface ReferralShareCardProps {
  referralCode: string;
  referralUrl: string;
  earnedAmount?: number;
  friendDiscount?: number;
}

export function ReferralShareCard({
  referralCode,
  referralUrl,
  earnedAmount = 50,
  friendDiscount = 50
}: ReferralShareCardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Code copied!",
      description: "Share it with your friends"
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 to-accent/90 p-6 text-white">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={24} />
          <h3 className="font-bold text-lg">Share & Earn</h3>
        </div>

        <p className="text-white/80 mb-4">
          Give ₹{friendDiscount} to friends, get ₹{earnedAmount} for each referral!
        </p>

        {/* Referral code box */}
        <div className="bg-white/20 backdrop-blur rounded-xl p-4 mb-4">
          <p className="text-sm text-white/70 mb-1">Your referral code</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl font-bold">{referralCode}</span>
            <button
              onClick={copyCode}
              className={cn(
                "p-2 rounded-lg transition-colors",
                copied ? "bg-green-500" : "bg-white/20 hover:bg-white/30"
              )}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <SocialSharing
            type="referral"
            title="Join Snackzo"
            description={`Use my code ${referralCode} to get ₹${friendDiscount} off!`}
            referralCode={referralCode}
            url={referralUrl}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// ACHIEVEMENT SHARE CARD
// ============================================

interface AchievementShareCardProps {
  badgeName: string;
  badgeDescription: string;
  badgeColor: string;
  badgeIcon: React.ReactNode;
}

export function AchievementShareCard({
  badgeName,
  badgeDescription,
  badgeColor,
  badgeIcon
}: AchievementShareCardProps) {
  return (
    <div className="rounded-2xl overflow-hidden">
      {/* Shareable card design */}
      <div
        className="p-6 text-white text-center"
        style={{ backgroundColor: badgeColor }}
      >
        <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
          {badgeIcon}
        </div>
        <h3 className="text-xl font-bold mb-2">Achievement Unlocked!</h3>
        <p className="text-2xl font-bold mb-2">{badgeName}</p>
        <p className="text-white/80">{badgeDescription}</p>

        <div className="mt-4 pt-4 border-t border-white/20 text-sm">
          Snackzo
        </div>
      </div>

      {/* Share button */}
      <div className="p-4 bg-card">
        <SocialSharing
          type="achievement"
          title={badgeName}
          description={badgeDescription}
        />
      </div>
    </div>
  );
}
