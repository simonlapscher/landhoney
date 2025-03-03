import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency, formatTokenAmount } from '../../utils/format';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { OrderDetailPopup } from './OrderDetailPopup';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { BaseAsset, DebtAsset, Asset as AssetType } from '../../lib/types/asset';
import { Transaction as BaseTransaction } from '../../lib/types/transaction';
import { PortfolioAsset } from '../../types/portfolio';
import { HoneyStakingModal } from './HoneyStakingModal';
import { HoneyUnstakingModal } from './HoneyUnstakingModal';
import { BitcoinStakingModal } from './BitcoinStakingModal';
import { BitcoinUnstakingModal } from './BitcoinUnstakingModal';
import { BitcoinAssetDisplay } from './BitcoinAssetDisplay';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { Pool, PoolBalance } from '../../lib/types/pool';
import { poolService } from '../../lib/services/poolService';
import { PoolStats } from './PoolStats';
import type { SimpleAsset } from '../../lib/types/asset';

interface RawAssetResponse extends BaseAsset {
  debt_assets?: {
    id: string;
    apr: number;
    duration_months: number;
    loan_amount: number;
    appraised_value: number;
    city: string;
    state: string;
  }[];
}

interface RawBalanceResponse {
  id: string;
  user_id: string;
  asset_id: string;
  balance: number;
  total_interest_earned: number;
  created_at: string;
  updated_at: string;
  last_transaction_at: string | null;
  asset: RawAssetResponse;
}

interface ExtendedAsset extends BaseAsset {
  apr?: number;
  location?: string;
}

interface TransactionWithAsset extends BaseTransaction {
  asset: ExtendedAsset;
}

interface Transaction extends Omit<BaseTransaction, 'type'> {
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'loan_distribution' | 'earn' | 'deposit' | 'withdraw';
  asset: ExtendedAsset;
}

interface PortfolioBalance {
  id: string;
  user_id: string;
  asset_id: string;
  balance: number;
  total_value: number;
  total_interest_earned: number;
  created_at: string;
  updated_at: string;
  last_transaction_at: string | null;
  asset: ExtendedAsset;
}

interface StakingInfo {
  honeyBalance: number;
  honeyXBalance: number;
  stakingPercentage: number;
}

interface BitcoinStakingInfo {
  btcXBalance: number;
  stakingPercentage: number;
}

type FilterType = 'all' | 'debt' | 'commodity' | 'cash';

const filters: { label: string; value: FilterType }[] = [
  { label: 'All Assets', value: 'all' },
  { label: 'Debt', value: 'debt' },
  { label: 'Commodities', value: 'commodity' },
  { label: 'Cash', value: 'cash' }
];

const getFilteredAssets = (assets: ExtendedAsset[], filter: FilterType) => {
  if (filter === 'all') return assets;
  return assets.filter(asset => asset.type === filter);
};

const isDebtAsset = (asset: ExtendedAsset): asset is ExtendedAsset & { type: 'debt' } => {
  return asset.type === 'debt';
};

// Remove or comment out the local Asset interface since we're using AssetType
// type AssetType = 'cash' | 'debt' | 'commodity';

// interface Asset {
//   symbol: string;
//   type: AssetType;
//   // ... other fields
// }

// In your mapping function where the balances are processed
const processBalances = (rawBalances: any[]) => {
  return rawBalances
    .filter(balance => {
      // Filter out pool share assets
      const symbol = balance.asset?.symbol;
      return symbol !== 'BTCPS' && symbol !== 'HONEYPS';
    })
    .map(balance => ({
      id: balance.id,
      user_id: balance.user_id,
      asset_id: balance.asset_id,
      balance: balance.balance,
      total_value: balance.balance * balance.asset.price_per_token,
      total_interest_earned: balance.total_interest_earned,
      created_at: balance.created_at,
      updated_at: balance.updated_at,
      last_transaction_at: balance.last_transaction_at,
      asset: {
        id: balance.asset.id,
        type: balance.asset.type,
        name: balance.asset.name,
        symbol: balance.asset.symbol,
        main_image: balance.asset.main_image,
        price_per_token: balance.asset.price_per_token,
        location: balance.asset.location,
        apr: balance.asset.apr
      }
    }));
};

const formatTransactionType = (transaction: Transaction) => {
  switch (transaction.type) {
    case 'deposit':
      return 'Deposited';
    case 'withdraw':
      return 'Withdrew';
    case 'buy':
      return 'Bought';
    case 'sell':
      return 'Sold';
    case 'stake':
      return 'Staked';
    case 'unstake':
      return 'Unstaked';
    case 'loan_distribution':
      return 'Loan Distribution';
    case 'earn':
      return 'Earned';
    default:
      return transaction.type;
  }
};

interface StakingPositionWithPool {
  id: string;
  amount: number;
  ownership_percentage: number;
  pool: {
    id: string;
    type: string;
    total_value_locked: number;
    main_asset: {
      price_per_token: number;
    };
  };
}

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
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

  // Check if we're in the admin portal context
  const isAdminPortal = window.location.pathname.startsWith('/admin') || (
    user?.email?.endsWith('@landhoney.io') && !user.email?.startsWith('simon+')
  );

  console.log('Portfolio component state:', {
    isAdminPortal,
    userEmail: user?.email,
    authLoading,
    loading,
    isRefreshing,
    error,
    transactionsCount: transactions.length,
    balancesCount: balances.length
  });

  const fetchPortfolioData = async (isBackgroundRefresh = false) => {
    if (!user) {
      console.log('No user found in Portfolio');
      setError('No authenticated user');
      setLoading(false);
      return;
    }

    if (isAdminPortal) {
      console.log('Admin portal or admin user detected, blocking portfolio access');
      setError('Portfolio view is not available for admin users');
      setLoading(false);
      return;
    }

    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      console.log('Fetching portfolio data for user:', {
        email: user.email,
        id: user.id,
        isBackgroundRefresh
      });

      // First get USD asset to ensure we always have it
      const { data: usdAsset } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'USD')
        .single();

      // Get all balances including USD
      const { data: rawBalances, error: balancesError } = await supabase
        .from('user_balances')
        .select(`
          *,
          asset:assets (
            *,
            debt_assets (
              id,
              apr,
              duration_months,
              loan_amount,
              appraised_value,
              city,
              state
            )
          )
        `)
        .eq('user_id', user.id);

      if (balancesError) throw balancesError;

      // Process balances and ensure USD is included
      let processedBalances = (rawBalances || []).reduce((acc, balance) => {
        // Skip HONEYX and BTCX as they'll be combined
        if (balance.asset.symbol === 'HONEYX' || balance.asset.symbol === 'BTCX') {
          return acc;
        }

        const isDebtType = balance.asset.type === 'debt';
        const debtDetails = isDebtType ? balance.asset.debt_assets?.[0] : null;

        let combinedBalance = Number(balance.balance);
        
        // If this is HONEY, add HONEYX balance
        if (balance.asset.symbol === 'HONEY') {
          const honeyXBalance = rawBalances.find(b => b.asset.symbol === 'HONEYX');
          if (honeyXBalance) {
            combinedBalance += Number(honeyXBalance.balance);
          }
        }

        // If this is BTC, add BTCX balance
        if (balance.asset.symbol === 'BTC') {
          const btcXBalance = rawBalances.find(b => b.asset.symbol === 'BTCX');
          if (btcXBalance) {
            combinedBalance += Number(btcXBalance.balance);
          }
        }

        return [...acc, {
          ...balance,
          balance: combinedBalance,
          total_value: combinedBalance * balance.asset.price_per_token,
          asset: {
            ...balance.asset,
            type: balance.asset.type,
            apr: debtDetails?.apr,
            location: isDebtType && debtDetails?.city && debtDetails?.state 
              ? `${debtDetails.city}, ${debtDetails.state}`
              : undefined
          }
        }];
      }, []);

      // Add USD with zero balance if it doesn't exist
      if (!processedBalances.some((b: PortfolioBalance) => b.asset.symbol === 'USD') && usdAsset) {
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

      // Get profile using email
      const { data: profile, error: profileError } = await supabase.rpc(
        'get_profile_by_email',
        { p_email: user.email }
      );

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new Error('Failed to verify user profile');
      }

      if (!profile) {
        console.error('No profile found for email:', user.email);
        throw new Error('User profile not found');
      }

      const [transactionsData, stakingData, btcData] = await Promise.all([
        transactionService.getUserTransactions(profile.user_id) as Promise<TransactionWithAsset[]>,
        transactionService.getHoneyStakingInfo(profile.user_id).catch(err => {
          console.warn('Failed to fetch staking info:', err);
          return null;
        }),
        transactionService.getBitcoinStakingInfo(profile.user_id).catch(err => {
          console.warn('Failed to fetch Bitcoin staking info:', err);
          return null;
        })
      ]);

      // Calculate 30-day returns from completed loan distribution transactions
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const returns = transactionsData
        .filter(t => 
          t.type === 'loan_distribution' && 
          t.status === 'completed' &&
          new Date(t.created_at) >= thirtyDaysAgo
        )
        .reduce((sum, t) => sum + (t.metadata?.usd_amount || 0), 0);
      
      setReturns30D(returns);

      // Get active staking positions to calculate total gains
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
        .eq('user_id', profile.user_id)
        .eq('status', 'active');

      if (stakingError) {
        console.error('Error fetching staking positions:', stakingError);
      } else if (stakingPositions) {
        // Calculate total staking gains
        const positions = stakingPositions as unknown as StakingPositionWithPool[];
        const totalGains = positions.reduce((sum, position) => {
          // Calculate initial stake value
          const initialStakeUSD = position.amount * position.pool.main_asset.price_per_token;
          // Calculate current value
          const currentValue = position.ownership_percentage * position.pool.total_value_locked;
          // Add the return (current value - initial stake) to total gains
          return sum + (currentValue - initialStakeUSD);
        }, 0);

        setStakingGains(totalGains);
      }

      console.log('Staking info:', stakingData);
      console.log('Bitcoin staking info:', btcData);

      if (transactionsData) {
        const mappedTransactions = transactionsData.map(t => ({
          ...t,
          asset: {
            ...t.asset,
            type: t.asset.symbol.startsWith('DEBT') ? 'debt' : 'commodity'
          }
        })) as Transaction[];

        setTransactions(mappedTransactions);
        setStakingInfo(stakingData);
        if (btcData) {
          const formattedBtcData: BitcoinStakingInfo = {
            btcXBalance: btcData.bitcoinXBalance,
            stakingPercentage: btcData.stakingPercentage
          };
          setBtcStakingInfo(formattedBtcData);
        } else {
          setBtcStakingInfo(null);
        }
        
        // Find BTC data from balances
        const btcBalanceData = processedBalances.find((b: PortfolioBalance) => b.asset.symbol === 'BTC');
        setBtcBalance(btcBalanceData?.balance || 0);
        // Use the BTC asset from balances data instead of staking data
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

  // Initial load
  useEffect(() => {
    console.log('Portfolio useEffect triggered:', {
      userEmail: user?.email,
      isAdminPortal
    });
    
    if (user && !isAdminPortal) {
      fetchPortfolioData(false); // Initial load should show loading state
    }
  }, [user, isAdminPortal]);

  // Auto-refresh interval
  useEffect(() => {
    if (!user || isAdminPortal) return;

    const interval = setInterval(() => {
      fetchPortfolioData(true);  // Background refresh for subsequent updates
    }, 30000);

    return () => clearInterval(interval);
  }, [user, isAdminPortal]);

  useEffect(() => {
    const fetchHoneyAsset = async () => {
      if (!user?.id) return;
      
      const { data: asset } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'HONEY')
        .single();
        
      if (asset) {
        setHoneyAsset(asset);
      }
    };
    
    fetchHoneyAsset();
  }, [user?.id]);

  const totalPortfolioValue = balances
    .filter(balance => balance.asset.symbol !== 'BTCPS' && balance.asset.symbol !== 'HONEYPS')
    .reduce((sum, balance) => sum + Number(balance.total_value), 0);
  
  const getCategoryTotal = (category: 'debt' | 'commodities') => {
    return balances
      .filter(balance => {
        // Filter out pool share assets and match category
        const symbol = balance.asset.symbol;
        if (symbol === 'BTCPS' || symbol === 'HONEYPS') return false;
        return category === 'debt' 
          ? balance.asset.type === 'debt'
          : balance.asset.type === 'commodity';
      })
      .reduce((total, balance) => total + (balance.balance * balance.asset.price_per_token), 0);
  };

  const debtTotal = getCategoryTotal('debt');
  const commoditiesTotal = getCategoryTotal('commodities');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleActionClick = (assetId: string, action: 'invest' | 'sell') => {
    navigate(`/app/invest/${assetId}${action === 'invest' ? '' : '?widget=sell'}`);
  };

  const getStatusDot = (status: string) => {
    const baseClasses = "inline-block w-2 h-2 rounded-full mr-2";
    switch (status) {
      case 'completed':
        return <span className={`${baseClasses} bg-[#00D897]`} />;
      case 'pending':
        return <span className={`${baseClasses} bg-[#FFD700]`} />;
      case 'failed':
      case 'cancelled':
        return <span className={`${baseClasses} bg-[#FF4444]`} />;
      default:
        return null;
    }
  };

  const handleTransactionClick = (transaction: Transaction, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setSelectedTransaction(transaction);
  };

  const renderBalances = () => {
    if (loading) return null;

    // Filter balances based on type and exclude pool shares
    let displayBalances = balances.filter(balance => {
      // First filter out pool shares
      if (balance.asset.symbol === 'BTCPS' || balance.asset.symbol === 'HONEYPS') {
        return false;
      }
      // Then apply type filter
      if (balance.asset.symbol === 'USD') {
        return assetType === 'all' || assetType === 'cash';
      }
      return assetType === 'all' || balance.asset.type === assetType;
    });

    // Sort balances by USD value in descending order
    displayBalances.sort((a, b) => {
      const aValue = a.balance * a.asset.price_per_token;
      const bValue = b.balance * b.asset.price_per_token;
      return bValue - aValue;
    });

    // Calculate subtotal for current category (excluding pool shares)
    const categorySubtotal = displayBalances.reduce((sum, balance) => 
      sum + (balance.balance * balance.asset.price_per_token), 0
    );

    if (displayBalances.length === 0 && assetType !== 'all' && assetType !== 'cash') {
      return (
        <div className="flex flex-col items-center py-12">
          <p className="text-light/60 text-lg mb-4">
            You don't have any {
              assetType === 'debt' ? 'debt assets' : 
              assetType === 'commodity' ? 'commodities' :
              'assets'
            }.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/app/invest')}
            className="!bg-[#00D897] hover:!bg-[#00C085] px-8"
          >
            Buy {
              assetType === 'debt' ? 'Debt' : 
              assetType === 'commodity' ? 'Commodities' :
              'Assets'
            }
          </Button>
        </div>
      );
    }

    return (
      <div>
        {/* Category Subtotal - Moved to top */}
        <div className="mb-6">
          <div className="text-2xl font-medium text-light">
            {formatCurrency(categorySubtotal)}
          </div>
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-[minmax(250px,2fr)_minmax(180px,1.5fr)_minmax(130px,1fr)_minmax(80px,0.7fr)_minmax(300px,2fr)] gap-4 px-4 py-2 text-light/60">
          <div className="text-left">Name</div>
          <div className="text-left">Balance</div>
          <div className="text-left">Current Price</div>
          <div className="text-left">APR</div>
          <div className="text-left">Actions</div>
        </div>

        {/* Assets List */}
        <div className="space-y-2">
          {displayBalances.map(balance => (
            <div key={balance.asset_id} className="grid grid-cols-1 p-3 hover:bg-light/5">
              <div className="grid grid-cols-[minmax(250px,2fr)_minmax(180px,1.5fr)_minmax(130px,1fr)_minmax(80px,0.7fr)_minmax(300px,2fr)] gap-4 items-center">
                <div className="flex items-center">
                  <div className="relative">
                    {balance.asset.symbol === 'HONEY' && stakingInfo && (
                      <div className="absolute inset-0 w-12 h-12 -left-1 -top-1">
                        <svg 
                          className="absolute inset-0 w-full h-full -rotate-90"
                          viewBox="0 0 48 48"
                          style={{ zIndex: 20 }}
                        >
                          <circle
                            cx="24"
                            cy="24"
                            r="21"
                            fill="none"
                            stroke="#2A2A2A"
                            strokeWidth="4"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="21"
                            fill="none"
                            stroke="#FFD700"
                            strokeWidth="4"
                            strokeDasharray={`${(stakingInfo.stakingPercentage / 100) * (2 * Math.PI * 21)} ${2 * Math.PI * 21}`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}
                    {balance.asset.symbol === 'BTC' ? (
                      <BitcoinAssetDisplay 
                        asset={balance.asset}
                        stakingPercentage={btcStakingInfo?.stakingPercentage || 0}
                      />
                    ) : (
                      <img
                        src={balance.asset.main_image}
                        alt={balance.asset.name}
                        className="w-10 h-10 rounded-full relative"
                        style={{
                          zIndex: 10,
                          border: balance.asset.symbol === 'HONEY' ? '2px solid transparent' : 'none',
                          background: balance.asset.symbol === 'HONEY' ? '#1E1E1E' : 'transparent'
                        }}
                      />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold truncate">
                      {balance.asset.type === 'debt' ? balance.asset.location : balance.asset.name}
                    </h3>
                    {balance.asset.symbol === 'HONEY' && stakingInfo ? (
                      <p className="text-sm text-gray-500">{stakingInfo.stakingPercentage.toFixed(1)}% staked</p>
                    ) : balance.asset.symbol === 'BTC' && btcStakingInfo ? (
                      <p className="text-sm text-gray-500">{btcStakingInfo.stakingPercentage.toFixed(1)}% staked</p>
                    ) : (
                      <p className="text-sm text-gray-500">{balance.asset.symbol}</p>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-light truncate">
                    {formatCurrency(balance.total_value)}
                  </div>
                  <div className="text-sm text-light/60 truncate">
                    {balance.asset.symbol === 'USD' 
                      ? formatTokenAmount(balance.balance)
                      : formatTokenAmount(balance.balance)
                    } {balance.asset.symbol}
                  </div>
                </div>
                <div className="text-light truncate">
                  {formatCurrency(balance.asset.price_per_token)}
                </div>
                <div className="text-light truncate">
                  {balance.asset.apr ? `${balance.asset.apr.toFixed(2)}%` : 'N/A'}
                </div>
                <div className="flex items-center gap-2">
                  {balance.asset.symbol === 'HONEY' && (
                    <div className="flex items-center gap-1 w-full">
                      <div className="flex gap-2 flex-1">
                        {stakingInfo && stakingInfo.honeyXBalance > 0 ? (
                          <>
                            <button
                              onClick={() => setShowHoneyStakingModal(true)}
                              className="w-28 whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium bg-gradient-to-r from-[#FFD700] to-[#FFA500]"
                            >
                              Stake More
                            </button>
                            <button
                              onClick={() => setShowHoneyUnstakingModal(true)}
                              className="w-28 whitespace-nowrap px-3 py-2 rounded-lg text-light font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A]"
                            >
                              Unstake
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowHoneyStakingModal(true)}
                            className="w-28 whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium bg-gradient-to-r from-[#FFD700] to-[#FFA500]"
                          >
                            Stake
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const menu = e.currentTarget.nextElementSibling;
                            document.querySelectorAll('.action-menu').forEach(el => {
                              if (el !== menu) el.classList.add('hidden');
                            });
                            menu?.classList.toggle('hidden');
                          }}
                          className="p-2 hover:bg-light/10 rounded-lg"
                        >
                          <svg className="w-6 h-6 text-light" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 14c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        <div className="action-menu hidden absolute right-0 mt-2 w-48 bg-[#1A1A1A] rounded-lg shadow-lg border border-light/10 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => navigate('/app/invest/d24940d4-f0d1-4811-811c-5877becd8145')}
                              className="w-full px-4 py-2 text-left text-light hover:bg-light/10"
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => navigate('/app/invest/d24940d4-f0d1-4811-811c-5877becd8145')}
                              className="w-full px-4 py-2 text-left text-light hover:bg-light/10"
                            >
                              Sell
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {balance.asset.symbol === 'BTC' && (
                    <div className="flex items-center gap-1 w-full">
                      <div className="flex gap-2 flex-1">
                        {btcStakingInfo && btcStakingInfo.btcXBalance > 0 ? (
                          <>
                            <button
                              onClick={() => setShowBitcoinStakingModal(true)}
                              className="w-28 whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium bg-gradient-to-r from-[#F7931A] to-[#FFAB4A]"
                            >
                              Stake More
                            </button>
                            <button
                              onClick={() => setShowBitcoinUnstakingModal(true)}
                              className="w-28 whitespace-nowrap px-3 py-2 rounded-lg text-light font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A]"
                            >
                              Unstake
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setShowBitcoinStakingModal(true)}
                            className="w-28 whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium bg-gradient-to-r from-[#F7931A] to-[#FFAB4A]"
                          >
                            Stake
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const menu = e.currentTarget.nextElementSibling;
                            document.querySelectorAll('.action-menu').forEach(el => {
                              if (el !== menu) el.classList.add('hidden');
                            });
                            menu?.classList.toggle('hidden');
                          }}
                          className="p-2 hover:bg-light/10 rounded-lg"
                        >
                          <svg className="w-6 h-6 text-light" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 14c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-7c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        <div className="action-menu hidden absolute right-0 mt-2 w-48 bg-[#1A1A1A] rounded-lg shadow-lg border border-light/10 z-50">
                          <div className="py-1">
                            <button
                              onClick={() => navigate('/app/invest/c1e21c9c-0b97-4363-8b0d-981a0b11d6c1')}
                              className="w-full px-4 py-2 text-left text-light hover:bg-light/10"
                            >
                              Buy
                            </button>
                            <button
                              onClick={() => navigate('/app/invest/c1e21c9c-0b97-4363-8b0d-981a0b11d6c1')}
                              className="w-full px-4 py-2 text-left text-light hover:bg-light/10"
                            >
                              Sell
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {balance.asset.type === 'debt' && (
                    <div className="flex items-center gap-2 w-full">
                      <div className="flex gap-2 flex-1">
                        <button
                          onClick={() => handleActionClick(balance.asset_id, 'invest')}
                          className="w-24 whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
                        >
                          Invest
                        </button>
                        <button
                          onClick={() => handleActionClick(balance.asset_id, 'sell')}
                          className="w-24 whitespace-nowrap px-3 py-2 rounded-lg text-light font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A]"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  )}
                  {balance.asset.type === 'cash' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedAsset(balance.asset);
                          setSelectedBalance(balance.balance);
                          setShowDepositModal(true);
                        }}
                        className="w-24 whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
                      >
                        Deposit
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAsset(balance.asset);
                          setSelectedBalance(balance.balance);
                          setShowWithdrawModal(true);
                        }}
                        className="w-24 whitespace-nowrap px-3 py-2 rounded-lg text-light font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A]"
                      >
                        Withdraw
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleStakeClick = (balance: PortfolioBalance) => {
    setSelectedHoneyAsset(balance);
    setShowStakingModal(true);
  };

  const handleUnstakeClick = (balance: PortfolioBalance) => {
    setSelectedHoneyAsset(balance);
    setShowUnstakingModal(true);
  };

  const renderTransactionHistory = () => {
    if (transactions.length === 0) {
      return (
        <div className="p-8 text-center text-light/60">
          <p>No transactions yet. Make your first investment to get started!</p>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-4 gap-4 p-4 text-light/60">
          <div className="text-left">Details</div>
          <div className="text-left">Amount</div>
          <div className="text-left">Date</div>
          <div className="text-left">Status</div>
        </div>
        
        <div className="divide-y divide-[#2A2A2A]">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid grid-cols-4 gap-4 p-4 items-center cursor-pointer hover:bg-dark-3/50"
              onClick={(e) => handleTransactionClick(transaction, e)}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={(() => {
                    const imageUrl = transaction.type === 'loan_distribution' && transaction.metadata?.source_asset_id
                      ? transaction.metadata.source_asset_main_image
                      : transaction.asset.main_image;
                    console.log('Transaction:', {
                      type: transaction.type,
                      amount: transaction.amount,
                      symbol: transaction.asset.symbol,
                      metadata: transaction.metadata,
                      imageUrl: imageUrl,
                      id: transaction.id
                    });
                    return imageUrl;
                  })()}
                  alt={transaction.metadata?.debt_asset_name || transaction.asset.name}
                  className="w-12 h-12 rounded-full"
                  onError={(e) => {
                    console.error('Image failed to load:', e.currentTarget.src);
                    e.currentTarget.src = transaction.asset.main_image; // Fallback to main image
                  }}
                />
                <div>
                  <span className="text-light">
                    {formatTransactionType(transaction)} {transaction.asset.symbol}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[#00D897] font-medium">
                  {formatCurrency(transaction.amount * transaction.price_per_token)}
                </p>
                <p className="text-sm text-light/60">
                  {formatTokenAmount(transaction.amount)} {transaction.asset.symbol}
                </p>
              </div>

              <div className="text-light">
                {formatDate(transaction.created_at)}
              </div>

              <div className="flex items-center text-light">
                {getStatusDot(transaction.status)}
                <span className="capitalize">{transaction.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAssetActions = (asset: SimpleAsset, balance: number) => {
    if (asset.type === 'cash') {
      return (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedAsset(asset);
              setSelectedBalance(balance);
              setShowDepositModal(true);
            }}
            className="px-4 py-2 bg-gradient-to-r from-primary to-primary-light rounded-lg"
          >
            Deposit
          </button>
          <button
            onClick={() => {
              setSelectedAsset(asset);
              setSelectedBalance(balance);
              setShowWithdrawModal(true);
            }}
            className="px-4 py-2 bg-secondary rounded-lg"
          >
            Withdraw
          </button>
        </div>
      );
    }
    return null;
  };

  const handleTransactionCreated = () => {
    fetchPortfolioData(true);
  };

  if (loading && !isRefreshing) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">Error loading portfolio: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold text-light mb-6">My Assets</h1>
          <div className="flex items-center">
            <div className="w-1/2">
              <div className="text-lg font-medium text-light">Total Value</div>
              <div className="text-4xl font-bold text-light mt-2">
                {formatCurrency(totalPortfolioValue)}
              </div>
            </div>

            <div className="flex gap-12">
              <div>
                <div className="text-lg font-medium text-light">Returns <span className="text-sm text-light/60 ml-1">30D</span></div>
                <div className="text-2xl font-medium text-[#00D54B] mt-2">
                  {formatCurrency(returns30D)}
                </div>
              </div>

              <div>
                <div className="text-lg font-medium text-light">Staking Gains</div>
                <div className="text-2xl font-medium text-[#00D54B] mt-2">
                  {formatCurrency(stakingGains)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Type Filter */}
        <div>
          <div className="border-b border-light/10">
            <nav className="flex space-x-8 pl-1">
              {filters.map((category) => (
                <button
                  key={category.value}
                  className={`pb-4 text-base font-medium border-b-2 -mb-px ${
                    assetType === category.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-light/60 hover:text-light/80 hover:border-light/30'
                  }`}
                  onClick={() => setAssetType(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>

        </div>

        {/* Asset List */}
        <div className="mt-8 mb-12">
          <div className="bg-dark-2 rounded-lg overflow-hidden">
            {renderBalances()}
          </div>
        </div>

        {/* Transaction History */}
        <div className="pl-1">
          <h2 className="text-xl font-semibold mb-4 text-light">Transaction History</h2>
          <div className="bg-dark-2 rounded-lg overflow-hidden">
            {renderTransactionHistory()}
          </div>
        </div>

        {/* Modals */}
        {selectedTransaction && (
          <OrderDetailPopup
            isOpen={selectedTransaction !== null}
            onClose={() => setSelectedTransaction(null)}
            transaction={{
              ...selectedTransaction,
              type: selectedTransaction.type === 'deposit' || selectedTransaction.type === 'withdraw'
                ? 'buy'  // Map deposit/withdraw to buy for display purposes
                : selectedTransaction.type
            }}
          />
        )}

        {selectedHoneyAsset && stakingInfo && (
          <>
            <HoneyStakingModal
              isOpen={showStakingModal}
              onClose={() => {
                setShowStakingModal(false);
                setSelectedHoneyAsset(null);
              }}
              honeyBalance={stakingInfo.honeyBalance}
              honeyXBalance={stakingInfo.honeyXBalance}
              stakingPercentage={stakingInfo.stakingPercentage}
              pricePerToken={selectedHoneyAsset.asset.price_per_token}
              userId={selectedHoneyAsset.user_id}
              onSuccess={() => {
                fetchPortfolioData(true);
              }}
              honeyAsset={selectedHoneyAsset.asset}
            />
            <HoneyUnstakingModal
              isOpen={showUnstakingModal}
              onClose={() => {
                setShowUnstakingModal(false);
                setSelectedHoneyAsset(null);
              }}
              onSuccess={() => {
                setShowUnstakingModal(false);
                fetchPortfolioData(true);
              }}
              honeyBalance={stakingInfo.honeyBalance}
              honeyXBalance={stakingInfo.honeyXBalance}
              stakingPercentage={stakingInfo.stakingPercentage}
              pricePerToken={selectedHoneyAsset.asset.price_per_token}
              userId={selectedHoneyAsset.user_id}
            />
          </>
        )}

        {/* Add Bitcoin Modals */}
        <BitcoinStakingModal
          isOpen={showBitcoinStakingModal}
          onClose={() => setShowBitcoinStakingModal(false)}
          bitcoinBalance={btcBalance - (btcStakingInfo?.btcXBalance || 0)}
          bitcoinXBalance={btcStakingInfo?.btcXBalance || 0}
          stakingPercentage={btcStakingInfo?.stakingPercentage || 0}
          pricePerToken={btcAsset?.price_per_token || 0}
          userId={user?.id || ''}
          onSuccess={() => {
            setShowBitcoinStakingModal(false);
            fetchPortfolioData(true);
          }}
        />
        <BitcoinUnstakingModal
          isOpen={showBitcoinUnstakingModal}
          onClose={() => setShowBitcoinUnstakingModal(false)}
          bitcoinBalance={btcBalance}
          bitcoinXBalance={btcStakingInfo?.btcXBalance || 0}
          stakingPercentage={btcStakingInfo?.stakingPercentage || 0}
          pricePerToken={btcAsset?.price_per_token || 0}
          userId={user?.id || ''}
          onSuccess={() => {
            setShowBitcoinUnstakingModal(false);
            fetchPortfolioData(true);
          }}
        />

        {selectedAsset && (
          <>
            <DepositModal
              isOpen={showDepositModal}
              onClose={() => setShowDepositModal(false)}
              asset={selectedAsset as unknown as AssetType}
              onSuccess={handleTransactionCreated}
            />
            <WithdrawModal
              isOpen={showWithdrawModal}
              onClose={() => setShowWithdrawModal(false)}
              asset={selectedAsset as unknown as AssetType}
              balance={selectedBalance}
              onSuccess={handleTransactionCreated}
            />
          </>
        )}

        {/* Add modals at the bottom of the component */}
        <HoneyStakingModal
          isOpen={showHoneyStakingModal}
          onClose={() => setShowHoneyStakingModal(false)}
          onSuccess={() => {
            setShowHoneyStakingModal(false);
            fetchPortfolioData(true);
          }}
          honeyBalance={stakingInfo?.honeyBalance || 0}
          honeyXBalance={stakingInfo?.honeyXBalance || 0}
          stakingPercentage={stakingInfo?.stakingPercentage || 0}
          pricePerToken={honeyAsset?.price_per_token || 0}
          userId={user?.id || ''}
          honeyAsset={honeyAsset as ExtendedAsset}
        />
        <HoneyUnstakingModal
          isOpen={showHoneyUnstakingModal}
          onClose={() => setShowHoneyUnstakingModal(false)}
          onSuccess={() => {
            setShowHoneyUnstakingModal(false);
            fetchPortfolioData(true);
          }}
          honeyBalance={stakingInfo?.honeyBalance || 0}
          honeyXBalance={stakingInfo?.honeyXBalance || 0}
          stakingPercentage={stakingInfo?.stakingPercentage || 0}
          pricePerToken={honeyAsset?.price_per_token || 0}
          userId={user?.id || ''}
        />
      </div>
    </div>
  );
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'text-green-400';
    case 'pending':
      return 'text-yellow-400';
    case 'failed':
      return 'text-red-400';
    case 'cancelled':
      return 'text-gray-400';
    default:
      return 'text-light/60';
  }
};

const sortByDate = (a: Transaction, b: Transaction) => {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}; 