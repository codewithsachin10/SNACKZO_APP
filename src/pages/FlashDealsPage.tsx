import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { FlashDeals, CouponInput } from '@/components/FlashDeals';
import { BottomNavigation } from '@/components/ui/BottomNavigation';
// import { useFeatures } from '@/contexts/FeatureContext'; // Temporarily disabled

const FlashDealsPage = () => {
  const navigate = useNavigate();
  // Feature flags - default to enabled since FeatureProvider is disabled
  const isFeatureEnabled = (feature: string) => true;

  if (!isFeatureEnabled('flash_deals')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Coming Soon!</h1>
          <p className="text-muted-foreground">Flash Deals feature is not available yet.</p>
          <button 
            onClick={() => navigate('/')} 
            className="mt-4 neu-btn bg-primary text-primary-foreground px-6 py-2"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Zap className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">⚡ Flash Deals</h1>
              <p className="text-muted-foreground">Limited time offers - grab them before they're gone!</p>
            </div>
          </div>
        </div>

        {/* Coupon Input */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3">Have a coupon code?</h2>
          <CouponInput />
        </div>

        {/* Flash Deals */}
        <FlashDeals />
      </main>

      <Footer />
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default FlashDealsPage;
