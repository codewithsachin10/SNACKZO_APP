import { NotificationPreferences } from '@/components/NotificationPreferences';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function NotificationSettings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-28 pb-24">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl font-bold">Notification Settings</h1>
            <p className="text-muted-foreground">
              Manage how and when you receive notifications
            </p>
          </div>

          <NotificationPreferences />
        </div>
      </main>

      <Footer />
    </div>
  );
}
