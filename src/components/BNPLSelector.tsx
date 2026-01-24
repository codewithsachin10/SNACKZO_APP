/**
 * Buy Now Pay Later (BNPL) Provider Selector
 * Allows users to choose between Simpl, ZestMoney, LazyPay, etc.
 */

import { useState } from "react";
import { Clock, Check, ExternalLink, Info } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface BNPLProvider {
  id: string;
  name: string;
  logo: string;
  description: string;
  limit: string;
  interest: string;
  processingTime: string;
  available: boolean;
}

interface BNPLSelectorProps {
  onSelect: (provider: BNPLProvider) => void;
  selectedProviderId?: string | null;
  orderAmount: number;
}

const bnplProviders: BNPLProvider[] = [
  {
    id: 'simpl',
    name: 'Simpl',
    logo: '🎯',
    description: 'Pay later, no interest',
    limit: 'Up to ₹10,000',
    interest: '0% interest',
    processingTime: 'Instant approval',
    available: true
  },
  {
    id: 'zestmoney',
    name: 'ZestMoney',
    logo: '💰',
    description: 'EMI options available',
    limit: 'Up to ₹50,000',
    interest: 'Starting 0%',
    processingTime: '2-5 min approval',
    available: true
  },
  {
    id: 'lazypay',
    name: 'LazyPay',
    logo: '⏰',
    description: 'Quick credit line',
    limit: 'Up to ₹1,00,000',
    interest: '0% for 15 days',
    processingTime: 'Instant approval',
    available: true
  }
];

export function BNPLSelector({
  onSelect,
  selectedProviderId,
  orderAmount
}: BNPLSelectorProps) {
  const [showInfo, setShowInfo] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={20} className="text-orange-500" />
        <h3 className="font-bold uppercase">Choose BNPL Provider</h3>
      </div>

      <div className="space-y-3">
        {bnplProviders.map((provider) => {
          const isSelected = selectedProviderId === provider.id;
          const isAvailable = provider.available && orderAmount <= 100000; // Check limit

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => isAvailable && onSelect(provider)}
              className={cn(
                "relative rounded-xl border-2 p-4 transition-all cursor-pointer",
                isSelected
                  ? "border-orange-500 bg-orange-500/10"
                  : isAvailable
                  ? "border-border bg-card hover:border-orange-500/50"
                  : "border-border bg-muted/50 opacity-60 cursor-not-allowed"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-3xl">{provider.logo}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-lg">{provider.name}</p>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {provider.description}
                    </p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Limit</p>
                        <p className="font-bold">{provider.limit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Interest</p>
                        <p className="font-bold text-lime">{provider.interest}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Approval</p>
                        <p className="font-bold">{provider.processingTime}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfo(showInfo === provider.id ? null : provider.id);
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <Info size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Info Panel */}
              {showInfo === provider.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-3 pt-3 border-t border-border space-y-2 text-xs"
                >
                  <p className="text-muted-foreground">
                    {provider.name} allows you to pay for your order later. 
                    {provider.id === 'simpl' && ' No interest, no hidden charges.'}
                    {provider.id === 'zestmoney' && ' Choose flexible EMI options.'}
                    {provider.id === 'lazypay' && ' Get instant credit approval.'}
                  </p>
                  <a
                    href={`https://${provider.id}.com`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-orange-500 font-bold hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Learn more <ExternalLink size={12} />
                  </a>
                </motion.div>
              )}

              {!isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                  <p className="text-xs font-bold text-muted-foreground">
                    Not available for this order
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <p className="text-xs text-muted-foreground">
          <strong>Note:</strong> BNPL providers will verify your eligibility during checkout. 
          Approval is subject to their terms and conditions.
        </p>
      </div>
    </div>
  );
}
