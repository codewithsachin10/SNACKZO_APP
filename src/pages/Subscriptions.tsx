import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Calendar, Clock, Check, X, Pause, Play, Edit2,
  ArrowLeft, Plus, Minus, ShoppingBag, Repeat, Gift, Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, addDays, addWeeks } from 'date-fns';
import Navbar from '@/components/Navbar';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  image_url: string;
  base_price: number;
  discount_percentage: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  is_customizable: boolean;
  max_items: number;
}

interface PlanItem {
  id: string;
  plan_id: string;
  product_id: string;
  quantity: number;
  is_required: boolean;
  product?: {
    name: string;
    price: number;
    image_url: string;
  };
}

interface UserSubscription {
  id: string;
  plan_id: string;
  status: 'active' | 'paused' | 'cancelled';
  frequency: string;
  next_delivery_date: string;
  delivery_address: string;
  total_price: number;
  plan?: SubscriptionPlan;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category_id: string;
}

const frequencyLabels = {
  weekly: 'Every Week',
  biweekly: 'Every 2 Weeks',
  monthly: 'Every Month',
};

const Subscriptions = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'browse' | 'my'>('browse');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<UserSubscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscription builder state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([]);
  const [selectedFrequency, setSelectedFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [isCreating, setIsCreating] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      const { data, error } = await (supabase
        .from('subscription_plans' as any)
        .select('*')
        .eq('is_active', true)
        .order('base_price') as any);

      if (!error && data) {
        setPlans(data as SubscriptionPlan[]);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  }, []);

  const fetchMySubscriptions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase
        .from('user_subscriptions' as any)
        .select('*, plan:plan_id(*)')
        .eq('user_id', user.id)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false }) as any);

      if (!error && data) {
        setMySubscriptions(data as UserSubscription[]);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  }, [user]);

  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select('id, name, price, image_url, category_id')
        .eq('is_available', true)
        .order('name');

      if (data) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    Promise.all([fetchPlans(), fetchMySubscriptions(), fetchProducts()]).finally(() => {
      setIsLoading(false);
    });
  }, [user, navigate, fetchPlans, fetchMySubscriptions, fetchProducts]);

  const calculateNextDelivery = (frequency: string) => {
    const now = new Date();
    switch (frequency) {
      case 'weekly':
        return addWeeks(now, 1);
      case 'biweekly':
        return addWeeks(now, 2);
      case 'monthly':
        return addDays(now, 30);
      default:
        return addWeeks(now, 1);
    }
  };

  const calculateTotal = () => {
    let total = selectedItems.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId);
      return sum + (product?.price || 0) * item.quantity;
    }, 0);

    if (selectedPlan?.discount_percentage) {
      total = total * (1 - selectedPlan.discount_percentage / 100);
    }

    return Math.round(total);
  };

  const addItem = (productId: string) => {
    const existing = selectedItems.find((i) => i.productId === productId);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setSelectedItems([...selectedItems, { productId, quantity: 1 }]);
    }
  };

  const removeItem = (productId: string) => {
    const existing = selectedItems.find((i) => i.productId === productId);
    if (existing && existing.quantity > 1) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
      );
    } else {
      setSelectedItems(selectedItems.filter((i) => i.productId !== productId));
    }
  };

  const getItemQuantity = (productId: string) => {
    return selectedItems.find((i) => i.productId === productId)?.quantity || 0;
  };

  const createSubscription = async () => {
    if (!user || !profile || selectedItems.length === 0) {
      toast.error('Please add items to your subscription');
      return;
    }

    setIsCreating(true);

    try {
      const deliveryAddress = `Room ${profile.room_number}, ${profile.hostel_block}`;
      const nextDelivery = calculateNextDelivery(selectedFrequency);
      const total = calculateTotal();

      // Create subscription
      const { data: subData, error: subError } = await (supabase
        .from('user_subscriptions' as any)
        .insert({
          user_id: user.id,
          plan_id: selectedPlan?.id || null,
          status: 'active',
          frequency: selectedFrequency,
          next_delivery_date: format(nextDelivery, 'yyyy-MM-dd'),
          delivery_address: deliveryAddress,
          total_price: total,
        })
        .select()
        .single() as any);

      if (subError) throw subError;

      // Add subscription items
      const itemsToInsert = selectedItems.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          subscription_id: (subData as any).id,
          product_id: item.productId,
          product_name: product?.name || '',
          quantity: item.quantity,
          price: product?.price || 0,
        };
      });

      await (supabase.from('user_subscription_items' as any).insert(itemsToInsert) as any);

      toast.success('Subscription created successfully!');
      setSelectedPlan(null);
      setSelectedItems([]);
      setActiveTab('my');
      fetchMySubscriptions();
    } catch (err) {
      console.error('Error creating subscription:', err);
      toast.error('Failed to create subscription');
    } finally {
      setIsCreating(false);
    }
  };

  const toggleSubscription = async (subId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';

    try {
      await (supabase
        .from('user_subscriptions' as any)
        .update({ status: newStatus })
        .eq('id', subId) as any);

      toast.success(`Subscription ${newStatus === 'active' ? 'resumed' : 'paused'}`);
      fetchMySubscriptions();
    } catch (err) {
      toast.error('Failed to update subscription');
    }
  };

  const cancelSubscription = async (subId: string) => {
    try {
      await (supabase
        .from('user_subscriptions' as any)
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', subId) as any);

      toast.success('Subscription cancelled');
      fetchMySubscriptions();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Subscriptions</h1>
            <p className="text-muted-foreground">Auto-delivery for your favorites</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <ShoppingBag size={16} />
              Browse Plans
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Repeat size={16} />
              My Subscriptions
              {mySubscriptions.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {mySubscriptions.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Browse Plans */}
          <TabsContent value="browse">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full mx-auto" />
              </div>
            ) : selectedPlan ? (
              /* Subscription Builder */
              <Card className="neu-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedPlan.name}</CardTitle>
                      <CardDescription>{selectedPlan.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedPlan(null)}>
                      <X size={18} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Frequency Selection */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Delivery Frequency</label>
                    <Select
                      value={selectedFrequency}
                      onValueChange={(v) => setSelectedFrequency(v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Every Week</SelectItem>
                        <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                        <SelectItem value="monthly">Every Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Select Items</label>
                      <span className="text-xs text-muted-foreground">
                        {selectedItems.reduce((s, i) => s + i.quantity, 0)} / {selectedPlan.max_items} items
                      </span>
                    </div>
                    <Progress
                      value={
                        (selectedItems.reduce((s, i) => s + i.quantity, 0) / selectedPlan.max_items) * 100
                      }
                      className="h-1 mb-3"
                    />

                    <ScrollArea className="h-64 border rounded-lg p-2">
                      <div className="space-y-2">
                        {products.map((product) => {
                          const qty = getItemQuantity(product.id);
                          return (
                            <div
                              key={product.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted"
                            >
                              <div className="flex items-center gap-3">
                                {product.image_url ? (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="w-10 h-10 rounded object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                    <Package size={16} />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-muted-foreground">₹{product.price}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {qty > 0 ? (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      onClick={() => removeItem(product.id)}
                                    >
                                      <Minus size={14} />
                                    </Button>
                                    <span className="w-6 text-center font-medium">{qty}</span>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      onClick={() => addItem(product.id)}
                                      disabled={
                                        selectedItems.reduce((s, i) => s + i.quantity, 0) >=
                                        selectedPlan.max_items
                                      }
                                    >
                                      <Plus size={14} />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => addItem(product.id)}
                                    disabled={
                                      selectedItems.reduce((s, i) => s + i.quantity, 0) >=
                                      selectedPlan.max_items
                                    }
                                  >
                                    <Plus size={14} className="mr-1" />
                                    Add
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  <Separator />

                  {/* Summary */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items Total</span>
                      <span>
                        ₹
                        {selectedItems.reduce((sum, item) => {
                          const product = products.find((p) => p.id === item.productId);
                          return sum + (product?.price || 0) * item.quantity;
                        }, 0)}
                      </span>
                    </div>
                    {selectedPlan.discount_percentage > 0 && (
                      <div className="flex justify-between text-sm text-lime">
                        <span>Subscription Discount</span>
                        <span>-{selectedPlan.discount_percentage}%</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total per {selectedFrequency.replace('ly', '')}</span>
                      <span>₹{calculateTotal()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      First delivery: {format(calculateNextDelivery(selectedFrequency), 'PPP')}
                    </p>
                  </div>

                  <Button
                    className="w-full neu-btn bg-lime text-background"
                    onClick={createSubscription}
                    disabled={selectedItems.length === 0 || isCreating}
                  >
                    {isCreating ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <>
                        <Repeat size={18} className="mr-2" />
                        Start Subscription
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* Plans Grid */
              <div className="grid gap-4 md:grid-cols-2">
                {/* Custom Box */}
                <Card
                  className="neu-card cursor-pointer hover:border-lime transition-colors"
                  onClick={() =>
                    setSelectedPlan({
                      id: 'custom',
                      name: 'Custom Box',
                      description: 'Build your own subscription with any items',
                      image_url: '',
                      base_price: 0,
                      discount_percentage: 5,
                      frequency: 'weekly',
                      is_customizable: true,
                      max_items: 20,
                    })
                  }
                >
                  <CardContent className="p-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-lime to-cyan rounded-xl flex items-center justify-center mb-4">
                      <Gift size={32} className="text-background" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Custom Box</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Build your own subscription with any items you want. Get 5% off!
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-lime text-background">5% OFF</Badge>
                      <Badge variant="outline">Up to 20 items</Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Preset Plans */}
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className="neu-card cursor-pointer hover:border-lime transition-colors"
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <CardContent className="p-6">
                      {plan.image_url ? (
                        <img
                          src={plan.image_url}
                          alt={plan.name}
                          className="w-16 h-16 rounded-xl object-cover mb-4"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-xl flex items-center justify-center mb-4">
                          <Package size={32} />
                        </div>
                      )}
                      <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                      <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold">₹{plan.base_price}</span>
                        <Badge variant="outline">{frequencyLabels[plan.frequency]}</Badge>
                      </div>
                      {plan.discount_percentage > 0 && (
                        <Badge className="bg-lime text-background mt-2">
                          {plan.discount_percentage}% OFF
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* My Subscriptions */}
          <TabsContent value="my">
            {mySubscriptions.length === 0 ? (
              <Card className="neu-card text-center py-12">
                <Repeat size={48} className="mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground mb-4">
                  Subscribe to get regular deliveries at a discount!
                </p>
                <Button className="bg-lime text-background" onClick={() => setActiveTab('browse')}>
                  Browse Plans
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {mySubscriptions.map((sub) => (
                  <Card key={sub.id} className="neu-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-bold">{(sub as any).plan?.name || 'Custom Box'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {frequencyLabels[sub.frequency as keyof typeof frequencyLabels]}
                          </p>
                        </div>
                        <Badge
                          className={
                            sub.status === 'active'
                              ? 'bg-lime text-background'
                              : sub.status === 'paused'
                              ? 'bg-yellow-500 text-background'
                              : 'bg-muted'
                          }
                        >
                          {sub.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-muted-foreground" />
                          <span>
                            Next: {format(new Date(sub.next_delivery_date), 'MMM d, yyyy')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-muted-foreground" />
                          <span>₹{sub.total_price}/delivery</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => toggleSubscription(sub.id, sub.status)}
                        >
                          {sub.status === 'active' ? (
                            <>
                              <Pause size={14} className="mr-1" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play size={14} className="mr-1" />
                              Resume
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm('Cancel this subscription?')) {
                              cancelSubscription(sub.id);
                            }
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Subscriptions;
