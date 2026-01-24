import { useNavigate } from 'react-router-dom';
import { Users, Repeat, Trophy, MessageCircle, MapPin, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    icon: Users,
    title: 'Group Orders',
    description: 'Pool orders with friends & split delivery fees',
    href: '/group-order',
    color: 'from-cyan-500 to-blue-500',
    badge: 'NEW',
  },
  {
    icon: Repeat,
    title: 'Subscriptions',
    description: 'Auto-delivery of your favorites with discounts',
    href: '/subscriptions',
    color: 'from-purple-500 to-pink-500',
    badge: 'NEW',
  },
  {
    icon: Trophy,
    title: 'Achievements',
    description: 'Earn badges, maintain streaks & win rewards',
    href: '/achievements',
    color: 'from-yellow-500 to-orange-500',
    badge: 'NEW',
  },
  {
    icon: MapPin,
    title: 'Live Tracking',
    description: 'Track your delivery in real-time',
    href: '/orders',
    color: 'from-green-500 to-emerald-500',
    badge: null,
  },
];

export function FeatureShowcase() {
  const navigate = useNavigate();

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="text-lime" size={24} />
          <h2 className="text-xl font-bold">New Features</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                className="neu-card cursor-pointer hover:border-lime transition-all hover:scale-[1.02] relative overflow-hidden"
                onClick={() => navigate(feature.href)}
              >
                <CardContent className="p-4">
                  {feature.badge && (
                    <Badge className="absolute top-2 right-2 bg-lime text-background text-[10px]">
                      {feature.badge}
                    </Badge>
                  )}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-3`}
                  >
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="font-bold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeatureShowcase;
