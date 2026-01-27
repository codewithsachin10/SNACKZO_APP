import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Chat, ConversationList } from '@/components/Chat';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (selectedConversation) {
    return (
      <Chat
        conversationId={selectedConversation}
        isModal={true}
        onClose={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-24 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground">Chat with delivery partners</p>
          </div>
        </div>

        <ConversationList onSelectConversation={setSelectedConversation} />
      </main>
    </div>
  );
};

export default Messages;
