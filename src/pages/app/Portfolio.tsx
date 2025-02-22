import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { transactionService } from '../../lib/services/transactionService';
import type { Transaction, PortfolioBalance, FilterType, StakingInfo, BitcoinStakingInfo, StakingPositionWithPool } from '../../lib/types/portfolio';
import type { ExtendedAsset, SimpleAsset } from '../../lib/types/asset';

export const Portfolio: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [bitcoinStakingInfo, setBitcoinStakingInfo] = useState<BitcoinStakingInfo | null>(null);

  const fetchPortfolioData = async (isBackgroundRefresh = false) => {
    if (!user) return;

    if (!isBackgroundRefresh) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      // Fetch user balances
      const { data: rawBalances, error: balancesError } = await supabase
        .from('user_balances')
        .select(`
          id,
          user_id,
          asset_id,
          balance,
          total_interest_earned,
          created_at,
          updated_at,
          last_transaction_at,
          asset:assets (
            id,
            symbol,
            name,
            type,
            price_per_token,
            apr,
            location
          )
        `)
        .eq('user_id', user.id);

      if (balancesError) throw balancesError;

      // Fetch staking positions
      const { data: stakingPositions, error: stakingError } = await supabase
        .from('staking_positions')
        .select(`
          id,
          amount,
          ownership_percentage,
          pool:pools (
            id,
            type,
            total_value_locked,
            main_asset:assets (
              price_per_token
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (stakingError) throw stakingError;

      // Process balances
      const processedBalances = (rawBalances || []).map((balance: any) => ({
        ...balance,
        total_value: balance.balance * (balance.asset?.price_per_token || 0)
      }));

      // Sort balances by total value
      const sortedBalances = processedBalances.sort((a: any, b: any) => 
        (b.total_value || 0) - (a.total_value || 0)
      );

      // Fetch staking info
      const honeyStakingInfo = await transactionService.getHoneyStakingInfo(user.id);
      const btcStakingInfo = await transactionService.getBitcoinStakingInfo(user.id);
      const transactions = await transactionService.getUserTransactions(user.id);

      setBalances(sortedBalances);
      setStakingInfo(honeyStakingInfo);
      setBitcoinStakingInfo(btcStakingInfo);
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();

    // Set up auto-refresh interval
    const interval = setInterval(() => {
      fetchPortfolioData(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="space-y-8">
      {/* Add your portfolio UI components here */}
    </div>
  );
}; 