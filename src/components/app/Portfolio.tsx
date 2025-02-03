import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { OrderDetailPopup } from './OrderDetailPopup';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { BaseAsset, DebtAsset, Asset } from '../../lib/types/asset';
import { Transaction as BaseTransaction } from '../../lib/types/transaction';
import { PortfolioAsset } from '../../types/portfolio';
import { HoneyStakingModal } from './HoneyStakingModal';
import { HoneyUnstakingModal } from './HoneyUnstakingModal';

interface RawAssetResponse extends BaseAsset {
  debt_assets?: {
    id: string;
    apr: number;
    term_months: number;
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
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'loan_distribution';
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

const isDebtAsset = (asset: ExtendedAsset): asset is ExtendedAsset & { type: 'debt' } => {
  return asset.type === 'debt';
};

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [assetType, setAssetType] = useState<'all' | 'debt' | 'commodities'>('all');
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [showStakingModal, setShowStakingModal] = useState(false);
  const [selectedHoneyAsset, setSelectedHoneyAsset] = useState<PortfolioBalance | null>(null);
  const [showUnstakingModal, setShowUnstakingModal] = useState(false);

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

      const [transactionsData, balancesData, stakingData] = await Promise.all([
        transactionService.getUserTransactions(profile.user_id) as Promise<TransactionWithAsset[]>,
        transactionService.getUserBalances(profile.user_id),
        transactionService.getHoneyStakingInfo(profile.user_id).catch(err => {
          console.warn('Failed to fetch staking info:', err);
          return null;
        })
      ]);

      console.log('Raw balances data:', balancesData);
      console.log('Staking info:', stakingData);

      if (transactionsData && balancesData) {
        const mappedTransactions = transactionsData.map(t => ({
          ...t,
          asset: {
            ...t.asset,
            type: t.asset.symbol.startsWith('DEBT') ? 'debt' : 'commodity'
          }
        })) as Transaction[];

        const mappedBalances = (balancesData as RawBalanceResponse[])
          .filter(b => Number(b.balance) > 0)
          .map(b => {
            console.log('Raw asset details:', {
              symbol: b.asset.symbol,
              type: b.asset.type,
              debtDetails: b.asset.debt_assets?.[0],
              rawAsset: b.asset
            });
            
            const isDebtType = b.asset.type === 'debt';
            const debtDetails = isDebtType ? b.asset.debt_assets?.[0] : null;
            
            const asset: ExtendedAsset = {
              ...b.asset,
              type: isDebtType ? 'debt' : 'commodity',
              apr: debtDetails?.apr,
              location: isDebtType && debtDetails?.city && debtDetails?.state 
                ? `${debtDetails.city}, ${debtDetails.state}`
                : undefined
            };
            
            return {
              id: b.id,
              user_id: b.user_id,
              asset_id: b.asset_id,
              balance: Number(b.balance),
              total_value: Number(b.balance) * Number(b.asset.price_per_token),
              total_interest_earned: Number(b.total_interest_earned),
              created_at: b.created_at,
              updated_at: b.updated_at,
              last_transaction_at: b.last_transaction_at || null,
              asset
            };
          }) as PortfolioBalance[];

        console.log('Mapped balances:', mappedBalances);

        setTransactions(mappedTransactions);
        setBalances(mappedBalances);
        setStakingInfo(stakingData);
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

  const totalPortfolioValue = balances.reduce((sum, balance) => sum + Number(balance.total_value), 0);
  
  const getCategoryTotal = (category: 'debt' | 'commodities') => {
    return balances
      .filter(balance => 
        category === 'debt' 
          ? balance.asset.type === 'debt'
          : balance.asset.type === 'commodity'
      )
      .reduce((sum, balance) => sum + balance.total_value, 0);
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
    navigate(`/app/assets/${assetId}${action === 'invest' ? '?widget=buy' : ''}`);
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

  const filteredBalances = balances
    .filter(balance => {
      // Hide HoneyX from the list
      if (balance.asset.symbol === 'HONEYX') return false;
      
      if (assetType === 'all') return true;
      if (assetType === 'debt') return balance.asset.type === 'debt';
      if (assetType === 'commodities') return balance.asset.type === 'commodity';
      return true;
    })
    .map(balance => {
      // For Honey, show combined balance of Honey + HoneyX
      if (balance.asset.symbol === 'HONEY' && stakingInfo) {
        return {
          ...balance,
          balance: stakingInfo.honeyBalance + stakingInfo.honeyXBalance,
          total_value: (stakingInfo.honeyBalance + stakingInfo.honeyXBalance) * balance.asset.price_per_token
        };
      }
      return balance;
    })
    .sort((a, b) => b.total_value - a.total_value);

  const handleStakeClick = (balance: PortfolioBalance) => {
    setSelectedHoneyAsset(balance);
    setShowStakingModal(true);
  };

  const handleUnstakeClick = (balance: PortfolioBalance) => {
    setSelectedHoneyAsset(balance);
    setShowUnstakingModal(true);
  };

  const renderHoneyStakingInfo = (balance: PortfolioBalance) => {
    if (balance.asset.symbol !== 'HONEY' || !stakingInfo) {
      return null;
    }

    return (
      <div className="flex items-center justify-between w-full mt-4">
        <div className="flex items-center space-x-2">
          <div className="relative w-6 h-6">
            <div 
              className="absolute inset-0 rounded-full border-2 border-[#FFD700]"
              style={{
                background: `conic-gradient(#FFD700 ${stakingInfo.stakingPercentage}%, transparent ${stakingInfo.stakingPercentage}%)`
              }}
            />
          </div>
          <span className="text-sm text-gray-500">
            {stakingInfo.stakingPercentage.toFixed(1)}% staked
          </span>
        </div>
        <Button
          variant="secondary"
          onClick={() => handleStakeClick(balance)}
          className="text-sm"
        >
          Manage Staking
        </Button>
      </div>
    );
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
        <div className="grid grid-cols-5 gap-4 p-4 text-light/60">
          <div className="text-left">Details</div>
          <div className="text-left">Amount</div>
          <div className="text-left">Date</div>
          <div className="text-left">Status</div>
          <div className="text-left">Actions</div>
        </div>
        
        <div className="divide-y divide-[#2A2A2A]">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="grid grid-cols-5 gap-4 p-4 items-center cursor-pointer hover:bg-dark-3/50"
              onClick={(e) => handleTransactionClick(transaction, e)}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={transaction.asset.main_image}
                  alt={transaction.asset.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <span className="text-light">
                    {transaction.type === 'stake' ? 'Staked' : 
                     transaction.type === 'unstake' ? 'Unstaked' :
                     transaction.type === 'buy' ? 'Bought' :
                     transaction.type === 'loan_distribution' ? 'Loan Distribution' :
                     'Sold'} {transaction.asset.symbol}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[#00D897] font-medium">
                  {formatCurrency(transaction.amount * transaction.price_per_token)}
                </p>
                <p className="text-sm text-light/60">
                  {transaction.amount} {transaction.asset.symbol}
                </p>
              </div>

              <div className="text-light">
                {formatDate(transaction.created_at)}
              </div>

              <div className="flex items-center text-light">
                {getStatusDot(transaction.status)}
                <span className="capitalize">{transaction.status}</span>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="!bg-[#00D897] hover:!bg-[#00C085] w-[72px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(transaction.asset_id, 'invest');
                  }}
                >
                  Invest
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="!bg-[#3A3A3A] hover:!bg-[#454545] !text-light w-[72px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(transaction.asset_id, 'sell');
                  }}
                >
                  Sell
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
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
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold text-light">My Assets</h1>
          <p className="text-2xl font-medium text-light pl-1">
            Total Value: {formatCurrency(totalPortfolioValue)}
          </p>
        </div>

        {/* Asset Type Filter */}
        <div>
          <div className="border-b border-light/10">
            <nav className="flex space-x-8 pl-1">
              {[
                { id: 'all', label: 'All Assets' },
                { id: 'debt', label: 'Debt' },
                { id: 'commodities', label: 'Commodities' }
              ].map((category) => (
                <button
                  key={category.id}
                  className={`pb-4 text-base font-medium border-b-2 -mb-px ${
                    assetType === category.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-light/60 hover:text-light/80 hover:border-light/30'
                  }`}
                  onClick={() => setAssetType(category.id as 'all' | 'debt' | 'commodities')}
                >
                  {category.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Category Subtotal */}
          <div className="mt-6 pl-1">
            <div className="text-2xl font-medium text-light">
              {formatCurrency(
                assetType === 'all'
                  ? totalPortfolioValue
                  : assetType === 'debt'
                    ? debtTotal
                    : commoditiesTotal
              )}
            </div>
          </div>
        </div>

        {/* Asset List */}
        <div className="mt-8 mb-12">
          <div className="bg-dark-2 rounded-lg overflow-hidden">
            {filteredBalances.length > 0 ? (
              <div>
                {/* Table Headers */}
                <div className="grid grid-cols-[minmax(250px,2fr)_minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(100px,1fr)_minmax(200px,1fr)] gap-4 p-4 text-light/60">
                  <div className="text-left">Name</div>
                  <div className="text-left">Balance</div>
                  <div className="text-left">Current Price</div>
                  <div className="text-left">APR</div>
                  <div className="text-left">Actions</div>
                </div>
                
                {/* Table Rows */}
                <div>
                  {filteredBalances.map((balance) => (
                    <div key={balance.asset_id} className="grid grid-cols-1 p-4 hover:bg-light/5">
                      <div className="grid grid-cols-[minmax(250px,2fr)_minmax(200px,1.5fr)_minmax(150px,1fr)_minmax(100px,1fr)_minmax(200px,1fr)] gap-4 items-center">
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
                          </div>
                          <div className="ml-3">
                            <h3 className="text-lg font-semibold truncate">
                              {balance.asset.type === 'debt' ? balance.asset.location : balance.asset.name}
                            </h3>
                            {balance.asset.symbol === 'HONEY' && stakingInfo ? (
                              <p className="text-sm text-gray-500">{stakingInfo.stakingPercentage.toFixed(1)}% staked</p>
                            ) : (
                              <p className="text-sm text-gray-500">{balance.asset.symbol}</p>
                            )}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-light truncate">${balance.total_value.toLocaleString()}</div>
                          <div className="text-sm text-light/60 truncate">
                            {balance.balance.toFixed(4)} {balance.asset.symbol}
                          </div>
                        </div>
                        <div className="text-light truncate">
                          ${balance.asset.price_per_token.toLocaleString()}
                        </div>
                        <div className="text-light truncate">
                          {balance.asset.apr ? `${balance.asset.apr.toFixed(2)}%` : 'N/A'}
                        </div>
                        <div>
                          {balance.asset.symbol === 'HONEY' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStakeClick(balance)}
                                className="whitespace-nowrap px-3 py-2 rounded-lg text-black font-medium"
                                style={{
                                  background: `url(https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Honey%20gradient.png)`,
                                  backgroundSize: 'cover'
                                }}
                              >
                                {stakingInfo && stakingInfo.stakingPercentage > 0 ? 'Stake More' : 'Stake'}
                              </button>
                              {stakingInfo && stakingInfo.stakingPercentage > 0 && (
                                <button
                                  onClick={() => handleUnstakeClick(balance)}
                                  className="whitespace-nowrap px-3 py-2 rounded-lg text-light font-medium bg-[#2A2A2A] hover:bg-[#3A3A3A]"
                                >
                                  Unstake
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12">
                <p className="text-light/60 text-lg mb-4">
                  You don't have any {assetType === 'all' ? 'assets' : assetType === 'debt' ? 'debt assets' : 'commodities'}.
                </p>
                <Button
                  variant="primary"
                  onClick={() => navigate('/app/invest')}
                  className="!bg-[#00D897] hover:!bg-[#00C085] px-8"
                >
                  Buy {assetType === 'all' ? 'Assets' : assetType === 'debt' ? 'Debt' : 'Commodities'}
                </Button>
              </div>
            )}
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
            transaction={selectedTransaction}
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
            />
            <HoneyUnstakingModal
              isOpen={showUnstakingModal}
              onClose={() => {
                setShowUnstakingModal(false);
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
            />
          </>
        )}
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