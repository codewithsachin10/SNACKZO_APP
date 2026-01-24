import { cn } from "@/lib/utils";

// ============================================
// SKELETON BASE COMPONENT
// ============================================

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  shimmer?: boolean;
}

export function Skeleton({ className, shimmer = true, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-muted/60 rounded-md",
        shimmer && "animate-pulse relative overflow-hidden",
        shimmer && "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

// ============================================
// PRODUCT CARD SKELETON
// ============================================

export function ProductCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="h-40 w-full rounded-none" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        
        {/* Rating */}
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-3 rounded-full" />
          ))}
          <Skeleton className="h-3 w-8 ml-2" />
        </div>
        
        {/* Price */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  );
}

// ============================================
// PRODUCT GRID SKELETON
// ============================================

interface ProductGridSkeletonProps {
  count?: number;
}

export function ProductGridSkeleton({ count = 8 }: ProductGridSkeletonProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// ORDER CARD SKELETON
// ============================================

export function OrderCardSkeleton() {
  return (
    <div className="glass-card p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      
      {/* Items preview */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-12 rounded-lg" />
        ))}
        <Skeleton className="h-12 w-12 rounded-lg opacity-50" />
      </div>
      
      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-border">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================
// ORDER LIST SKELETON
// ============================================

interface OrderListSkeletonProps {
  count?: number;
}

export function OrderListSkeleton({ count = 3 }: OrderListSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// CATEGORY CARD SKELETON
// ============================================

export function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="h-16 w-16 rounded-2xl" />
      <Skeleton className="h-4 w-14" />
    </div>
  );
}

// ============================================
// CATEGORY ROW SKELETON
// ============================================

export function CategoryRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================
// SEARCH RESULT SKELETON
// ============================================

export function SearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border">
      <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-5 w-12" />
    </div>
  );
}

// ============================================
// HERO SKELETON
// ============================================

export function HeroSkeleton() {
  return (
    <div className="relative h-[50vh] min-h-[400px]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-40 rounded-full mt-4" />
      </div>
    </div>
  );
}

// ============================================
// PROFILE SKELETON
// ============================================

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <Skeleton className="h-24 w-24 rounded-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-48" />
      <div className="w-full max-w-sm space-y-3 mt-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// WALLET SKELETON
// ============================================

export function WalletSkeleton() {
  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="glass-card p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-3 mt-4">
          <Skeleton className="h-10 flex-1 rounded-lg" />
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
      
      {/* Transactions */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 glass-card">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FLASH DEAL SKELETON
// ============================================

export function FlashDealSkeleton() {
  return (
    <div className="glass-card p-4 min-w-[280px]">
      <div className="flex gap-3">
        <Skeleton className="h-20 w-20 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-6 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      </div>
      <Skeleton className="h-2 w-full mt-3 rounded-full" />
    </div>
  );
}

// ============================================
// TIMELINE SKELETON
// ============================================

export function TimelineSkeleton() {
  return (
    <div className="space-y-6 pl-8 relative">
      {/* Timeline line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-muted" />
      
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="relative">
          <Skeleton className="absolute -left-8 top-1 h-6 w-6 rounded-full" />
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// STATS CARD SKELETON
// ============================================

export function StatsCardSkeleton() {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// CHART SKELETON
// ============================================

export function ChartSkeleton() {
  return (
    <div className="glass-card p-4">
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="flex items-end gap-2 h-40">
        {[40, 70, 55, 80, 45, 90, 60].map((h, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

// ============================================
// PAGE SKELETON (Full page loading)
// ============================================

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar placeholder */}
      <div className="h-16 border-b border-border">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Content placeholder */}
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
