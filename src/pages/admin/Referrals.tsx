import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
}

interface PendingReward {
  profile_id: string;
  user_email: string;
  used_referral_code: string;
  referral_investment_amount: number;
  referrer_email: string;
  created_at: string;
}

export const Referrals: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [referralCode, setReferralCode] = useState('');
  const [pendingRewards, setPendingRewards] = useState<PendingReward[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    fetchPendingRewards();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      searchUsers(searchTerm);
    } else {
      setUsers([]);
    }
  }, [searchTerm]);

  const searchUsers = async (term: string) => {
    if (term.length < 2) return;
    
    try {
      const { data, error } = await adminSupabase
        .rpc('search_users_by_email', {
          search_term: term
        });

      if (error) throw error;
      setUsers(data || []);
      setShowUserDropdown(true);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    }
  };

  const fetchPendingRewards = async () => {
    try {
      const { data, error } = await adminSupabase
        .from('pending_referral_rewards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingRewards(data);
    } catch (error) {
      console.error('Error fetching pending rewards:', error);
      toast.error('Failed to load pending rewards');
    }
  };

  const handleCreateReferralCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !referralCode) {
      toast.error('Please select a user and enter a referral code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await adminSupabase.rpc('create_referral_code', {
        p_code: referralCode.toUpperCase(),
        p_referrer_id: selectedUser
      });

      if (error) throw error;

      toast.success('Referral code created successfully');
      setReferralCode('');
      setSelectedUser('');
      setSearchTerm('');
    } catch (error: any) {
      console.error('Error creating referral code:', error);
      toast.error(error.message || 'Failed to create referral code');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRewarded = async (profileId: string) => {
    try {
      const { error } = await adminSupabase.rpc('mark_referral_rewarded', {
        p_profile_id: profileId
      });

      if (error) throw error;

      toast.success('Marked as rewarded');
      fetchPendingRewards();
    } catch (error) {
      console.error('Error marking reward:', error);
      toast.error('Failed to mark as rewarded');
    }
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user.id);
    setSearchTerm(user.email);
    setShowUserDropdown(false);
  };

  return (
    <div className="p-6 space-y-8">
      <div className="bg-[#1A1A1A] rounded-xl border border-light/10 p-6">
        <h2 className="text-xl font-bold text-light mb-6">Create Referral Code</h2>
        
        <form onSubmit={handleCreateReferralCode} className="space-y-6">
          <div className="relative">
            <label className="text-sm text-light/60 mb-2 block">Select User</label>
            <div className="relative">
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by email..."
                onFocus={() => setShowUserDropdown(true)}
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-light/40 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            
            {showUserDropdown && users.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[#2A2A2A] border border-light/10 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {users.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full px-4 py-2 text-left text-light hover:bg-light/10 transition-colors"
                    onClick={() => handleSelectUser(user)}
                  >
                    {user.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm text-light/60 mb-2 block">Referral Code</label>
            <Input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter 6-12 character code"
              maxLength={12}
            />
            <p className="text-sm text-light/60 mt-1">
              Code must be 6-12 characters, letters and numbers only
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            disabled={!selectedUser || !referralCode}
          >
            Create Referral Code
          </Button>
        </form>
      </div>

      <div className="bg-[#1A1A1A] rounded-xl border border-light/10 p-6">
        <h2 className="text-xl font-bold text-light mb-6">Pending Referral Rewards</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-light">
            <thead>
              <tr className="text-left border-b border-light/10">
                <th className="py-3 px-4">New User</th>
                <th className="py-3 px-4">Investment</th>
                <th className="py-3 px-4">Referral Code</th>
                <th className="py-3 px-4">Referred By</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingRewards.map((reward) => (
                <tr key={reward.profile_id} className="border-b border-light/10">
                  <td className="py-3 px-4">{reward.user_email}</td>
                  <td className="py-3 px-4">${reward.referral_investment_amount.toLocaleString()}</td>
                  <td className="py-3 px-4">{reward.used_referral_code}</td>
                  <td className="py-3 px-4">{reward.referrer_email}</td>
                  <td className="py-3 px-4">
                    {new Date(reward.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleMarkRewarded(reward.profile_id)}
                    >
                      Mark Rewarded
                    </Button>
                  </td>
                </tr>
              ))}
              {pendingRewards.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-light/60">
                    No pending rewards
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 