import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { transactionService } from '../../lib/services/transactionService';
import { formatCurrency, formatTokenAmount } from '../../lib/utils/formatters';
import { Transaction, TransactionWithAsset } from '../../lib/types/transaction';
import { PortfolioBalance, StakingInfo, BitcoinStakingInfo, SimpleAsset, ExtendedAsset, DebtAsset } from '../../lib/types/portfolio';
import { StakingPositionWithPool } from '../../lib/types/pool';
import { Button } from '../../components/common/Button';
import { BitcoinAssetDisplay } from '../../components/common/BitcoinAssetDisplay';
import { OrderDetailPopup } from '../../components/common/OrderDetailPopup';

interface DisplayBalance extends PortfolioBalance {
  total_value: number;
}

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithAsset[]>([]);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithAsset | null>(null);
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
        transactionService.getHoneyStakingInfo(profile.user_id),
        transactionService.getBitcoinStakingInfo(profile.user_id)
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
        .reduce((sum: number, t: TransactionWithAsset) => sum + (t.metadata?.usd_amount || 0), 0);
      
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
        const totalGains = positions.reduce((sum: number, position: StakingPositionWithPool) => {
          const initialStakeUSD = position.amount * position.pool.main_asset.price_per_token;
          const currentValue = position.ownership_percentage * position.pool.total_value_locked;
          return sum + (currentValue - initialStakeUSD);
        }, 0);

        setStakingGains(totalGains);
      }

      if (transactionsData) {
        setTransactions(transactionsData);
        setStakingInfo(stakingData);
        if (btcData) {
          const formattedBtcData: BitcoinStakingInfo = {
            bitcoinBalance: btcData.bitcoinBalance,
            bitcoinXBalance: btcData.bitcoinXBalance,
            stakingPercentage: btcData.stakingPercentage
          };
          setBtcStakingInfo(formattedBtcData);
        } else {
          setBtcStakingInfo(null);
        }
        
        // Find BTC data from balances
        const btcBalanceData = balances.find(b => b.asset.symbol === 'BTC');
        setBtcBalance(btcBalanceData?.balance || 0);
        setBtcAsset(btcBalanceData?.asset || null);
      }

      // Process balances and ensure USD is included
      let processedBalances = (balances || []).reduce<PortfolioBalance[]>((acc, balance) => {
        // Skip pool share assets (HONEYPS and BTCPS)
        if (balance.asset.symbol === 'HONEYPS' || balance.asset.symbol === 'BTCPS') {
          return acc;
        }

        const isDebtType = balance.asset.type === 'debt';
        const debtAsset = isDebtType ? (balance.asset as DebtAsset).debt_assets?.[0] : null;

        let combinedBalance = Number(balance.balance);
        
        // If this is HONEY, add HONEYX balance
        if (balance.asset.symbol === 'HONEY') {
          const honeyXBalance = balances.find(b => b.asset.symbol === 'HONEYX');
          if (honeyXBalance) {
            combinedBalance += Number(honeyXBalance.balance);
          }
        }

        // If this is BTC, add BTCX balance
        if (balance.asset.symbol === 'BTC') {
          const btcXBalance = balances.find(b => b.asset.symbol === 'BTCX');
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
            apr: debtAsset?.apr || undefined,
            location: debtAsset?.city && debtAsset?.state 
              ? `${debtAsset.city}, ${debtAsset.state}`
              : undefined
          }
        }];
      }, []);

      if (processedBalances) {
        setBalances(processedBalances);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">{error}</div>
        <Button onClick={() => navigate('/')} variant="secondary">
          Return Home
        </Button>
      </div>
    );
  }

  if (isAdminPortal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">
          Portfolio view is not available for admin users
        </div>
        <Button onClick={() => navigate('/')} variant="secondary">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col space-y-8">
        {/* Portfolio Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Portfolio</h1>
          <div className="flex space-x-4">
            <Button
              onClick={() => fetchPortfolioData(true)}
              variant="secondary"
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Asset Type Filter */}
        <div className="flex space-x-4">
          {['all', 'debt', 'commodity', 'cash'].map((type) => (
            <Button
              key={type}
              onClick={() => setAssetType(type as typeof assetType)}
              variant={assetType === type ? 'primary' : 'secondary'}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>

        {/* Portfolio Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {balances
            .filter((balance) => 
              assetType === 'all' || balance.asset.type === assetType
            )
            .map((balance) => (
              <div
                key={balance.asset.id}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center space-x-4">
                  {balance.asset.symbol === 'BTC' ? (
                    <BitcoinAssetDisplay 
                      asset={balance.asset}
                      stakingPercentage={btcStakingInfo?.stakingPercentage || 0}
                    />
                  ) : (
                    <img
                      src={balance.asset.main_image}
                      alt={balance.asset.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">{balance.asset.name}</h3>
                    <p className="text-gray-500">{balance.asset.symbol}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-lg font-semibold">
                    {formatTokenAmount(balance.balance)} {balance.asset.symbol}
                  </p>
                  <p className="text-sm text-gray-500">Value</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(balance.balance * balance.asset.price_per_token)}
                  </p>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button
                    onClick={() => {
                      setSelectedAsset(balance.asset);
                      setSelectedBalance(balance.balance);
                      setShowDepositModal(true);
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    Deposit
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedAsset(balance.asset);
                      setSelectedBalance(balance.balance);
                      setShowWithdrawModal(true);
                    }}
                    variant="secondary"
                    className="flex-1"
                  >
                    Withdraw
                  </Button>
                </div>
              </div>
            ))}
        </div>

        {/* Transaction History */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr
                    key={transaction.id}
                    onClick={() => setSelectedTransaction(transaction)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {transaction.asset.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatTokenAmount(transaction.amount)} {transaction.asset.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transaction.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : transaction.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {selectedTransaction && (
          <OrderDetailPopup
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
            isOpen={!!selectedTransaction}
          />
        )}
      </div>
    </div>
  );
}; 