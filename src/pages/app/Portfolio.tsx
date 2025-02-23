import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { transactionService } from '../../lib/services/transactionService';
import { formatCurrency, formatTokenAmount } from '../../lib/utils/formatters';
import { Transaction, TransactionWithAsset } from '../../lib/types/transaction';
import { PortfolioBalance, StakingInfo, BitcoinStakingInfo, SimpleAsset, ExtendedAsset } from '../../lib/types/portfolio';
import { StakingPositionWithPool } from '../../lib/types/pool';
import { Button } from '../../components/common/Button';
import { BitcoinAssetDisplay } from '../../components/common/BitcoinAssetDisplay';
import { OrderDetailPopup } from '../../components/common/OrderDetailPopup';

interface DisplayBalance extends PortfolioBalance {
  total_value: number;
}

const fetchPortfolioData = async (isBackgroundRefresh = false) => {
    if (!user) return;

    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setIsRefreshing(true);

      // Get all data in parallel using Promise.all
      const [
        { data: balancesData, error: balancesError },
        { data: profile, error: profileError },
        { data: stakingPositions, error: stakingError }
      ] = await Promise.all([
        // Get balances with asset info
        supabase
          .from('user_balances')
          .select(`
            *,
            asset:assets (
              id,
              symbol,
              name,
              type,
              price_per_token,
              main_image,
              location
            )
          `)
          .eq('user_id', user.id),
        
        // Get profile
        supabase.rpc('get_profile_by_email', { p_email: user.email }),
        
        // Get staking positions
        supabase
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
          .eq('status', 'active')
      ]);

      if (balancesError) throw balancesError;
      if (profileError) throw profileError;
      if (stakingError) throw stakingError;
      if (!profile) throw new Error('User profile not found');

      // Process balances
      const processedBalances = balancesData.map(balance => ({
        ...balance,
        total_value: balance.balance * balance.asset.price_per_token
      }));

      // Add USD with zero balance if it doesn't exist
      const usdAsset = processedBalances.find(b => b.asset.symbol === 'USD')?.asset;
      if (!processedBalances.some(b => b.asset.symbol === 'USD') && usdAsset) {
        processedBalances.unshift({
          id: 'usd-placeholder',
          user_id: user.id,
          asset_id: usdAsset.id,
          balance: 0,
          total_value: 0,
          total_interest_earned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_transaction_at: null,
          asset: usdAsset
        });
      }

      setBalances(processedBalances);

      // Get transactions and staking info in parallel
      const [transactionsData, stakingData, btcData] = await Promise.all([
        transactionService.getUserTransactions(profile.user_id),
        transactionService.getHoneyStakingInfo(profile.user_id),
        transactionService.getBitcoinStakingInfo(profile.user_id)
      ]);

      // Calculate 30-day returns
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const returns = transactionsData
        .filter(t => 
          t.type === 'loan_distribution' && 
          t.status === 'completed' &&
          new Date(t.created_at) >= thirtyDaysAgo
        )
        .reduce((sum: number, t: TransactionWithAsset) => sum + (t.metadata?.usd_amount || 0), 0);
      
      setReturns30D(returns);

      // Calculate staking gains
      if (stakingPositions) {
        const totalGains = stakingPositions.reduce((sum: number, position: StakingPositionWithPool) => {
          const initialStakeUSD = position.amount * position.pool.main_asset.price_per_token;
          const currentValue = position.ownership_percentage * position.pool.total_value_locked;
          return sum + (currentValue - initialStakeUSD);
        }, 0);

        setStakingGains(totalGains);
      }

      // Update state with all fetched data
      if (transactionsData) {
        const mappedTransactions = transactionsData.map(t => ({
          ...t,
          asset: {
            ...t.asset,
            type: t.asset.symbol.startsWith('DEBT') ? 'debt' : 'commodity'
          }
        }));

        setTransactions(mappedTransactions);
        setStakingInfo(stakingData);
        
        if (btcData) {
          setBtcStakingInfo({
            btcXBalance: btcData.bitcoinXBalance,
            stakingPercentage: btcData.stakingPercentage
          });
        }
        
        const btcBalanceData = processedBalances.find(b => b.asset.symbol === 'BTC');
        setBtcBalance(btcBalanceData?.balance || 0);
        setBtcAsset(btcBalanceData?.asset || null);
      }
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      if (!isBackgroundRefresh) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  };

// Auto-refresh interval
useEffect(() => {
  if (!user || isAdminPortal) return;

  const interval = setInterval(() => {
    fetchPortfolioData(true);  // Background refresh for subsequent updates
  }, 300000); // Changed from 30000 to 300000 (5 minutes)

  return () => clearInterval(interval);
}, [user, isAdminPortal]); 

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [assetType, setAssetType] = useState<'all' | 'debt' | 'commodity' | 'cash'>('all');
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [showStakingModal, setShowStakingModal] = useState(false);
  const [selectedHoneyAsset, setSelectedHoneyAsset] = useState<PortfolioBalance | null>(null);
  const [showUnstakingModal, setShowUnstakingModal] = useState(false);
  const [returns30D, setReturns30D] = useState<number>(0);
  const [stakingGains, setStakingGains] = useState<number>(0);
  const [showBitcoinStakingModal, setShowBitcoinStakingModal] = useState(false);
  const [showBitcoinUnstakingModal, setShowBitcoinUnstakingModal] = useState(false);
  const [btcBalance, setBtcBalance] = useState<number>(0);
  const [btcAsset, setBtcAsset] = useState<ExtendedAsset | null>(null);
  const [btcStakingInfo, setBtcStakingInfo] = useState<BitcoinStakingInfo | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<SimpleAsset | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<number>(0);
  const [showHoneyStakingModal, setShowHoneyStakingModal] = useState(false);
  const [showHoneyUnstakingModal, setShowHoneyUnstakingModal] = useState(false);
  const [honeyAsset, setHoneyAsset] = useState<ExtendedAsset | null>(null);

  // ... rest of the code ...

  // Fix the reduce functions with proper type definitions
  const returns = transactionsData
    .filter(t => 
      t.type === 'loan_distribution' && 
      t.status === 'completed' &&
      new Date(t.created_at) >= thirtyDaysAgo
    )
    .reduce((sum: number, t: TransactionWithAsset) => sum + (t.metadata?.usd_amount || 0), 0);

  setReturns30D(returns);

  // Calculate total staking gains with proper types
  const totalGains = positions.reduce((sum: number, position: StakingPositionWithPool) => {
    const initialStakeUSD = position.amount * position.pool.main_asset.price_per_token;
    const currentValue = position.ownership_percentage * position.pool.total_value_locked;
    return sum + (currentValue - initialStakeUSD);
  }, 0);

  setStakingGains(totalGains);

  // ... rest of the code ...

  // Fix the categorySubtotal calculation with proper types
  const categorySubtotal = displayBalances.reduce((sum: number, balance: DisplayBalance) => 
    sum + (balance.balance * balance.asset.price_per_token), 0
  );

  // ... rest of the code ...
} 