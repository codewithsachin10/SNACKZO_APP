import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Users, Plus, Copy, Share2, Clock, ShoppingCart, Check, X,
  ArrowLeft, Lock, Unlock, Trash2, Crown, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import Navbar from '@/components/Navbar';

interface GroupOrder {
  id: string;
  name: string;
  created_by: string;
  status: 'open' | 'locked' | 'ordered' | 'delivered' | 'cancelled';
  invite_code: string;
  hostel_block: string;
  max_members: number;
  delivery_address: string;
  order_deadline: string;
  min_order_amount: number;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  is_admin: boolean;
  has_paid: boolean;
  subtotal: number;
  share_of_delivery: number;
  profile?: {
    full_name: string;
  };
}

interface GroupItem {
  id: string;
  member_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

const GroupOrdering = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();

  const [view, setView] = useState<'list' | 'create' | 'join' | 'detail'>('list');
  const [groups, setGroups] = useState<GroupOrder[]>([]);
  const [currentGroup, setCurrentGroup] = useState<GroupOrder | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [items, setItems] = useState<GroupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    deadline: '',
    deadlineTime: '21:00',
    minAmount: '100',
  });

  // Join form state
  const [joinCode, setJoinCode] = useState('');

  // Auto-redirect to checkout when locked
  useEffect(() => {
    if (currentGroup?.status === 'locked') {
      navigate(`/group-checkout/${currentGroup.id}`);
    }
  }, [currentGroup?.status, currentGroup?.id, navigate]);



  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      // Step 1: Get IDs of groups where user is a member
      const { data: memberData } = await (supabase
        .from('group_order_members' as any)
        .select('group_order_id')
        .eq('user_id', user.id) as any);

      const memberGroupIds = memberData ? memberData.map((m: any) => m.group_order_id) : [];

      // Step 2: Fetch groups created by user OR where user is a member
      // We construct a filter string for the OR condition using the IDs
      let query = supabase
        .from('group_orders' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (memberGroupIds.length > 0) {
        // user created it OR id is in memberGroupIds
        // format: created_by.eq.USER_ID,id.in.(ID1,ID2,...)
        query = query.or(`created_by.eq.${user.id},id.in.(${memberGroupIds.join(',')})`);
      } else {
        // Just created by user
        query = query.eq('created_by', user.id);
      }

      const { data, error } = await (query as any);

      if (!error && data) {
        setGroups(data as GroupOrder[]);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchGroupDetails = useCallback(async (id: string | undefined) => {
    if (!id) return;
    try {
      // Fetch group
      const { data: groupData } = await (supabase
        .from('group_orders' as any)
        .select('*')
        .eq('id', id)
        .single() as any);

      if (groupData) {
        setCurrentGroup(groupData as GroupOrder);
      }

      // Fetch members (raw)
      const { data: membersData } = await (supabase
        .from('group_order_members' as any)
        .select('*')
        .eq('group_order_id', id) as any);

      if (membersData) {
        const rawMembers = membersData as GroupMember[];
        // Manually fetch names to ensure it works
        const userIds = rawMembers.map(m => m.user_id);

        let profilesData: any[] = [];
        if (userIds.length > 0) {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', userIds);
          profilesData = data || [];
        }

        // Map profiles to members
        const enrichedMembers = rawMembers.map(member => ({
          ...member,
          profile: profilesData.find(p => p.user_id === member.user_id) || { full_name: 'Unknown User' }
        }));

        setMembers(enrichedMembers);
      }

      // Fetch items
      const { data: itemsData } = await (supabase
        .from('group_order_items' as any)
        .select('*')
        .eq('group_order_id', id) as any);

      if (itemsData) {
        setItems(itemsData as GroupItem[]);
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
    }
  }, []);

  useEffect(() => {
    if (!currentGroup) return;

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`group-${currentGroup.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_orders', filter: `id=eq.${currentGroup.id}` },
        (payload) => {
          // Immediately update local state or fetch
          fetchGroupDetails(currentGroup.id);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_order_items', filter: `group_order_id=eq.${currentGroup.id}` },
        () => fetchGroupDetails(currentGroup.id)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'group_order_members', filter: `group_order_id=eq.${currentGroup.id}` },
        () => fetchGroupDetails(currentGroup.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGroup, fetchGroupDetails]);

  useEffect(() => {
    // Wait for auth to load first
    if (authLoading) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    if (groupId) {
      setView('detail');
      fetchGroupDetails(groupId);
    } else {
      fetchGroups();
    }
  }, [user, authLoading, groupId, fetchGroups, fetchGroupDetails, navigate]);

  // Auto-redirect to checkout when locked
  useEffect(() => {
    if (currentGroup?.status === 'locked') {
      navigate(`/group-checkout/${currentGroup.id}`);
    }
  }, [currentGroup?.status, currentGroup?.id, navigate]);

  const handleLockGroup = async () => {
    if (!currentGroup) return;
    try {
      const { error } = await supabase
        .from('group_orders' as any)
        .update({ status: 'locked' })
        .eq('id', currentGroup.id);

      if (error) throw error;
      // Navigation will happen via the useEffect above due to realtime subscription
    } catch (err) {
      console.error('Error locking group:', err);
      toast.error('Failed to lock group');
    }
  };

  if (!user) return null;

  // List View
  if (view === 'list' && !groupId) {
    // ... existing list view code ... (preserving context, but replacing the component logic flow if needed, but wait, I can just insert the function and keep the render)
    // Actually, I should just insert the function before the render return.
  }

  // ... (skipping to the render part for the button)

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateGroup = async () => {
    if (!user || !profile) return;
    if (!createForm.name || !createForm.deadline) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const deadline = new Date(`${createForm.deadline}T${createForm.deadlineTime}`);
      if (isPast(deadline)) {
        toast.error('Deadline must be in the future');
        return;
      }

      const inviteCode = generateInviteCode();
      const deliveryAddress = `${profile.hostel_block}, Room ${profile.room_number}`;

      const { data: groupData, error: groupError } = await (supabase
        .from('group_orders' as any)
        .insert({
          name: createForm.name,
          created_by: user.id,
          invite_code: inviteCode,
          hostel_block: profile.hostel_block,
          delivery_address: deliveryAddress,
          order_deadline: deadline.toISOString(),
          min_order_amount: parseFloat(createForm.minAmount) || 0,
        })
        .select()
        .single() as any);

      if (groupError) throw groupError;

      // Add creator as member & admin
      await (supabase
        .from('group_order_members' as any)
        .insert({
          group_order_id: (groupData as any).id,
          user_id: user.id,
          is_admin: true,
        }) as any);

      toast.success('Group created! Share the code with friends');
      navigate(`/group-order/${(groupData as any).id}`);
    } catch (err) {
      console.error('Error creating group:', err);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !joinCode.trim()) {
      toast.error('Please enter an invite code');
      return;
    }

    try {
      // Find group by code
      const { data: groupData, error: findError } = await (supabase
        .from('group_orders' as any)
        .select('*')
        .eq('invite_code', joinCode.toUpperCase())
        .eq('status', 'open')
        .single() as any);

      if (findError || !groupData) {
        toast.error('Invalid or expired invite code');
        return;
      }

      const group = groupData as GroupOrder;

      // Check if deadline passed
      if (isPast(new Date(group.order_deadline))) {
        toast.error('This group order has expired');
        return;
      }

      // Check if already a member
      const { data: existingMember } = await (supabase
        .from('group_order_members' as any)
        .select('id')
        .eq('group_order_id', group.id)
        .eq('user_id', user.id)
        .single() as any);

      if (existingMember) {
        navigate(`/group-order/${group.id}`);
        return;
      }

      // Join the group
      await (supabase
        .from('group_order_members' as any)
        .insert({
          group_order_id: group.id,
          user_id: user.id,
          is_admin: false,
        }) as any);

      toast.success(`Joined "${group.name}"!`);
      navigate(`/group-order/${group.id}`);
    } catch (err) {
      console.error('Error joining group:', err);
      toast.error('Failed to join group');
    }
  };

  const copyInviteCode = async () => {
    if (!currentGroup) return;
    await navigator.clipboard.writeText(currentGroup.invite_code);
    setIsCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const shareGroup = async () => {
    if (!currentGroup) return;
    const shareText = `🛒 Join my group order "${currentGroup.name}" on Hostel Mart!\n\nCode: ${currentGroup.invite_code}\nDeadline: ${format(new Date(currentGroup.order_deadline), 'PPp')}\n\nJoin now and save on delivery!`;

    if (navigator.share) {
      await navigator.share({ title: 'Join Group Order', text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Share text copied!');
    }
  };

  const getMemberItems = (memberId: string) => items.filter((i) => i.member_id === memberId);
  const getMemberTotal = (memberId: string) =>
    getMemberItems(memberId).reduce((sum, i) => sum + i.price * i.quantity, 0);

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.is_admin || currentGroup?.created_by === user?.id;
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const memberCount = members.length;
  const deliveryPerPerson = memberCount > 0 ? Math.ceil(10 / memberCount) : 0;

  if (!user) return null;

  // List View
  if (view === 'list' && !groupId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-28 pb-24 max-w-2xl">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Group Orders</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="neu-btn"
                onClick={() => setView('join')}
              >
                <UserPlus size={18} className="mr-2" />
                Join
              </Button>
              <Button
                className="neu-btn bg-lime text-background"
                onClick={() => setView('create')}
              >
                <Plus size={18} className="mr-2" />
                Create
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-lime border-t-transparent rounded-full mx-auto" />
            </div>
          ) : groups.length === 0 ? (
            <Card className="neu-card text-center py-12">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-bold mb-2">No Group Orders Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create a group order with friends to split delivery fees!
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setView('join')}>
                  Join with Code
                </Button>
                <Button className="bg-lime text-background" onClick={() => setView('create')}>
                  Create Group
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="neu-card cursor-pointer hover:border-lime transition-colors"
                  onClick={() => navigate(`/group-order/${group.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold">{group.name}</h3>
                      <Badge
                        variant={group.status === 'open' ? 'default' : 'secondary'}
                        className={group.status === 'open' ? 'bg-lime text-background' : ''}
                      >
                        {group.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {isPast(new Date(group.order_deadline))
                          ? 'Expired'
                          : `Ends ${formatDistanceToNow(new Date(group.order_deadline), { addSuffix: true })}`}
                      </span>
                      <span>₹{group.total_amount || 0} total</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Create View
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-28 pb-24 max-w-md">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setView('list')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>

          <Card className="neu-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-lime" />
                Create Group Order
              </CardTitle>
              <CardDescription>
                Pool orders with friends and split delivery fees!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Group Name</label>
                <Input
                  placeholder="e.g., Room 204 Snack Run"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">Deadline Date</label>
                  <Input
                    type="date"
                    value={createForm.deadline}
                    onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Deadline Time</label>
                  <Input
                    type="time"
                    value={createForm.deadlineTime}
                    onChange={(e) => setCreateForm({ ...createForm, deadlineTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Minimum Order (₹)</label>
                <Input
                  type="number"
                  placeholder="100"
                  value={createForm.minAmount}
                  onChange={(e) => setCreateForm({ ...createForm, minAmount: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Set a minimum total to ensure the order is worth it
                </p>
              </div>
              <Button
                className="w-full neu-btn bg-lime text-background"
                onClick={handleCreateGroup}
              >
                Create Group
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Join View
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-28 pb-24 max-w-md">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setView('list')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>

          <Card className="neu-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="text-lime" />
                Join Group Order
              </CardTitle>
              <CardDescription>
                Enter the invite code shared by your friend
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Enter 6-digit code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="text-center text-2xl tracking-widest font-mono"
              />
              <Button
                className="w-full neu-btn bg-lime text-background"
                onClick={handleJoinGroup}
                disabled={joinCode.length !== 6}
              >
                Join Group
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Detail View
  if (view === 'detail' && currentGroup) {
    const isExpired = isPast(new Date(currentGroup.order_deadline));

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-28 pb-24 max-w-2xl">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/group-order')}
          >
            <ArrowLeft size={18} className="mr-2" />
            Back to Groups
          </Button>

          {/* Group Header */}
          <Card className="neu-card mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h1 className="text-xl font-bold">{currentGroup.name}</h1>
                  <p className="text-sm text-muted-foreground">
                    {currentGroup.hostel_block} • {memberCount} members
                  </p>
                </div>
                <Badge
                  className={
                    currentGroup.status === 'open' && !isExpired
                      ? 'bg-lime text-background'
                      : 'bg-muted'
                  }
                >
                  {isExpired ? 'Expired' : currentGroup.status}
                </Badge>
              </div>

              {/* Invite Code */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-3">
                <span className="text-sm text-muted-foreground">Code:</span>
                <span className="font-mono font-bold text-lg tracking-widest flex-1">
                  {currentGroup.invite_code}
                </span>
                <Button size="sm" variant="ghost" onClick={copyInviteCode}>
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </Button>
                <Button size="sm" variant="ghost" onClick={shareGroup}>
                  <Share2 size={16} />
                </Button>
              </div>

              {/* Deadline */}
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock size={16} />
                  Deadline:
                </span>
                <span className={isExpired ? 'text-destructive' : 'font-medium'}>
                  {format(new Date(currentGroup.order_deadline), 'PPp')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="neu-card mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingCart size={20} />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Items Total</span>
                  <span>₹{totalAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee (split)</span>
                  <span>₹10 ÷ {memberCount} = ₹{deliveryPerPerson}/person</span>
                </div>
                {currentGroup.min_order_amount > 0 && (
                  <div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Min. Order: ₹{currentGroup.min_order_amount}</span>
                      <span>{totalAmount >= currentGroup.min_order_amount ? '✓' : `₹${currentGroup.min_order_amount - totalAmount} more`}</span>
                    </div>
                    <Progress
                      value={Math.min(100, (totalAmount / currentGroup.min_order_amount) * 100)}
                      className="h-1 mt-1"
                    />
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Grand Total</span>
                  <span>₹{totalAmount + 10}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Members */}
          <Card className="neu-card mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users size={20} />
                Members ({memberCount})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {members.map((member) => {
                    const memberItems = getMemberItems(member.id);
                    const memberTotal = getMemberTotal(member.id);

                    return (
                      <div key={member.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {(member as any).profiles?.full_name || 'Unknown'}
                            </span>
                            {member.is_admin && (
                              <Crown size={14} className="text-yellow-500" />
                            )}
                            {member.user_id === user?.id && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                          </div>
                          <span className="font-bold">₹{memberTotal}</span>
                        </div>
                        {memberItems.length > 0 ? (
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {memberItems.map((item) => (
                              <div key={item.id} className="flex justify-between">
                                <span>{item.product_name} × {item.quantity}</span>
                                <span>₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            No items added yet
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Actions */}
          {currentGroup.status === 'open' && !isExpired && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="w-full neu-btn bg-lime text-background h-auto py-3 flex-col gap-1"
                  onClick={() => navigate(`/products?group=${currentGroup.id}`)}
                >
                  <Plus size={24} />
                  <span>Add Snacks</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full neu-btn bg-background h-auto py-3 flex-col gap-1"
                  onClick={() => fetchGroupDetails(currentGroup.id)}
                >
                  <Users size={24} />
                  <span>Refresh List</span>
                </Button>
              </div>

              {isAdmin && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase text-center">Admin Controls</p>
                  <Button
                    variant="default"
                    className="w-full neu-btn bg-primary text-primary-foreground"
                    disabled={totalAmount < currentGroup.min_order_amount}
                    onClick={handleLockGroup}
                  >
                    <Lock size={18} className="mr-2" />
                    {totalAmount < currentGroup.min_order_amount
                      ? `Add ₹${currentGroup.min_order_amount - totalAmount} more to Checkout`
                      : "Lock & Checkout Group Order"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  return null;
};

export default GroupOrdering;
