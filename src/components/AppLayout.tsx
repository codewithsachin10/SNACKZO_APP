import { ReactNode } from 'react';
import { BottomNavigation, FloatingCartButton } from '@/components/ui/BottomNavigation';
import { PullToRefresh } from '@/components/ui/PullToRefresh';

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showCartButton?: boolean;
  enablePullToRefresh?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}

export function AppLayout({ 
  children, 
  showBottomNav = true, 
  showCartButton = true,
  enablePullToRefresh = false,
  onRefresh,
  className = ''
}: AppLayoutProps) {
  const content = (
    <div className={`min-h-screen bg-background ${showBottomNav ? 'pb-20 md:pb-0' : ''} ${className}`}>
      {children}
      
      {/* Mobile Bottom Navigation - Hidden on Desktop */}
      {showBottomNav && (
        <div className="md:hidden">
          <BottomNavigation />
        </div>
      )}
      
      {/* Floating Cart Button - Visible when bottom nav is hidden */}
      {showCartButton && !showBottomNav && (
        <FloatingCartButton />
      )}
    </div>
  );

  if (enablePullToRefresh && onRefresh) {
    return (
      <PullToRefresh onRefresh={onRefresh}>
        {content}
      </PullToRefresh>
    );
  }

  return content;
}

// Higher-order component for pages that need pull-to-refresh
export function withPullToRefresh<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  getRefreshFn: (props: P) => () => Promise<void>
) {
  return function WithPullToRefreshComponent(props: P) {
    return (
      <PullToRefresh onRefresh={getRefreshFn(props)}>
        <WrappedComponent {...props} />
      </PullToRefresh>
    );
  };
}
