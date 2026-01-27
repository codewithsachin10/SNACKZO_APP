import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import MarqueeAnnouncement from "@/components/MarqueeAnnouncement";
import HeroSection from "@/components/HeroSection";
import CategorySection from "@/components/CategorySection";
import FeaturedProducts from "@/components/FeaturedProducts";
import { FlashSalesTimer } from "@/components/FlashSalesTimer";
import { FeatureShowcase } from "@/components/FeatureShowcase";
import Footer from "@/components/Footer";
import { ReorderSuggestions } from "@/components/ReorderSuggestions";
import { useAuth } from "@/contexts/AuthContext";
import AppTutorial from "@/components/AppTutorial";
import HomeBanners from "@/components/HomeBanners";

const Index = () => {
  const { user } = useAuth();
  // const { isFeatureEnabled } = useFeatures();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(async () => {
    // Trigger a re-render of child components
    setRefreshKey(prev => prev + 1);
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
  }, []);

  return (
    // <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <AppTutorial />
      <Navbar />
      <MarqueeAnnouncement />

      <section className="container mx-auto px-4">
        <HomeBanners />
      </section>

      {/* Flash Deals Banner - Temporarily disabled
        {isFeatureEnabled('flash_deals') && (
          <FlashDealsBanner />
        )}
        */}

      <HeroSection />

      {/* Spin Wheel Widget - Temporarily disabled
        {user && isFeatureEnabled('spin_wheel') && (
          <section className="container mx-auto px-4 py-4">
            <MiniSpinWidget />
          </section>
        )}
        */}

      {/* Reorder Suggestions - Show for logged in users */}
      {user && (
        <section className="container mx-auto px-4 py-6">
          <ReorderSuggestions key={refreshKey} limit={5} variant="horizontal" />
        </section>
      )}

      {/* New Features Showcase */}
      <FeatureShowcase />

      {/* Flash Deals Section - Temporarily disabled
        {isFeatureEnabled('flash_deals') && (
          <section className="container mx-auto px-4 py-6">
            <FlashDeals />
          </section>
        )}
        */}

      {/* Flash Sales Timer (Legacy - can coexist or replace) */}
      <section className="container mx-auto px-4 py-6">
        <FlashSalesTimer />
      </section>

      <CategorySection />
      <FeaturedProducts key={refreshKey} />
      <Footer />


    </div>
    // </PullToRefresh>
  );
};

export default Index;
