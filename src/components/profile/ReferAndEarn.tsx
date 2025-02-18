import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { toast } from 'react-hot-toast';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

interface ReferralCode {
  code: string;
  total_referrals: number;
  total_rewards: number;
}

export const ReferAndEarn: React.FC = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReferralCode();
      checkPendingRequest();
    }
  }, [user]);

  const fetchReferralCode = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('referrer_id', user?.id)
        .single();

      if (error) throw error;
      setReferralCode(data);
    } catch (error) {
      console.error('Error fetching referral code:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPendingRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_requests')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'pending')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setHasPendingRequest(!!data);
    } catch (error) {
      console.error('Error checking pending request:', error);
    }
  };

  const handleRequestJoin = async () => {
    try {
      const { error } = await supabase
        .from('referral_requests')
        .insert({ user_id: user?.id });

      if (error) throw error;
      setHasPendingRequest(true);
      toast.success('Request submitted successfully');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    const referralLink = `${window.location.origin}?ref=${referralCode.code}`;
    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success('Referral link copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="max-w-4xl w-full px-4">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold text-light">
            Refer a friend, get $250
          </h1>
          <div className="text-light/60 text-lg max-w-2xl mx-auto">
            <p className="inline">Share your referral code with friends.</p>
            <br />
            <p className="inline">When they sign up and invest over $5,000, you'll both earn $250 in Honey.</p>
          </div>
        </div>

        {referralCode ? (
          <div className="space-y-12">
            {/* Referral Code Section */}
            <div className="max-w-md mx-auto">
              <div className="flex items-center justify-between bg-[#1A1A1A] rounded-xl p-4 border border-light/10">
                <code className="text-xl font-mono text-light">{referralCode.code}</code>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-dark font-medium hover:from-[#FFE44D] hover:to-[#FFB347] transition-all flex items-center gap-2"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                  Copy Link
                </button>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-light mb-2">
                  {referralCode.total_referrals}
                </div>
                <div className="text-light/60">Total Referrals</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-light mb-2">
                  ${referralCode.total_rewards.toFixed(2)}
                </div>
                <div className="text-light/60">Rewards Earned</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center">
            {hasPendingRequest ? (
              <p className="text-light/60">
                Your request to join the referral program is pending approval.
              </p>
            ) : (
              <button
                onClick={handleRequestJoin}
                className="px-6 py-3 bg-primary text-dark font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Request to Join Program
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 