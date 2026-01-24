import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SpinWheel } from '@/components/SpinWheel';
import { BottomNavigation } from '@/components/ui/BottomNavigation';
import { useAuth } from '@/contexts/AuthContext';
// import { useFeatures } from '@/contexts/FeatureContext'; // Temporarily disabled
import { useEffect } from 'react';

const SpinWheelPage = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  // Feature flags - default to enabled since FeatureProvider is disabled
  const isFeatureEnabled = (feature: string) => true;

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (!isFeatureEnabled('spin_wheel')) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Coming Soon!</h1>
          <p className="text-muted-foreground">The Spin & Win feature is not available yet.</p>
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
          <div>
            <h1 className="text-3xl font-bold">🎰 Spin & Win</h1>
            <p className="text-muted-foreground">Try your luck and win amazing rewards!</p>
          </div>
        </div>

        {/* Spin Wheel Component */}
        <SpinWheel />
      </main>

      <Footer />
      
      {/* Mobile Bottom Navigation */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </div>
  );
};

export default SpinWheelPage;
