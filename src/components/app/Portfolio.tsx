import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { OrderDetailPopup } from './OrderDetailPopup';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { Asset, DebtAsset } from '../../lib/types/asset';
import { Transaction as BaseTransaction } from '../../lib/types/transaction';
import { PortfolioAsset, CommodityAsset } from '../../types/portfolio';

interface TransactionWithAsset extends BaseTransaction {
  asset: {
    name: string;
    symbol: string;
    main_image: string;
    price_per_token: number;
    type: 'debt' | 'commodity';
    apr?: number;
    id: string;
    created_at: string;
    updated_at: string;
  };
}

interface Transaction extends Omit<BaseTransaction, 'type'> {
  type: 'buy' | 'sell';
  asset: PortfolioAsset;
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
  asset: PortfolioAsset;
}

const isDebtAsset = (asset: Asset): asset is DebtAsset => {
  return asset.type === 'debt';
};

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const { originalUser, user, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<PortfolioBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [assetType, setAssetType] = useState<'all' | 'debt' | 'commodities'>('all');

  console.log('Portfolio component state:', {
    hasOriginalUser: !!originalUser,
    originalUserEmail: originalUser?.email,
    currentUserEmail: user?.email,
    authLoading,
    loading,
    isRefreshing,
    error,
    transactionsCount: transactions.length,
    balancesCount: balances.length
  });

  const fetchPortfolioData = async (isBackgroundRefresh = false) => {
    if (!originalUser) {
      console.log('No original user found in Portfolio');
      setError('No authenticated user');
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
        email: originalUser.email,
        id: originalUser.id,
        isBackgroundRefresh
      });

      const [transactionsData, balancesData] = await Promise.all([
        transactionService.getUserTransactions(originalUser.id) as Promise<TransactionWithAsset[]>,
        transactionService.getUserBalances(originalUser.id)
      ]);

      console.log('Raw balances data:', balancesData);

      if (transactionsData && balancesData) {
        const mappedTransactions = transactionsData.map(t => ({
          ...t,
          asset: {
            ...t.asset,
            type: t.asset.symbol.startsWith('DEBT') ? 'debt' : 'commodity',
            id: t.asset_id,
            created_at: t.created_at,
            updated_at: t.updated_at
          }
        })) as Transaction[];

        const mappedBalances = balancesData
          .filter(b => Number(b.balance) > 0)
          .map(b => {
            console.log('Raw asset details:', {
              symbol: b.asset.symbol,
              type: b.asset.symbol.startsWith('DEBT') ? 'debt' : 'commodity',
              debtDetails: b.asset.debt_assets?.[0],
              rawAsset: b.asset
            });
            
            const isDebtAsset = b.asset.symbol.startsWith('DEBT');
            const debtDetails = isDebtAsset ? b.asset.debt_assets?.[0] : null;
            
            const asset: PortfolioAsset = {
              ...b.asset,
              type: isDebtAsset ? 'debt' : 'commodity',
              price_per_token: Number(b.asset.price_per_token),
              apr: debtDetails?.apr
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

  useEffect(() => {
    console.log('Portfolio useEffect triggered:', {
      hasOriginalUser: !!originalUser,
      originalUserEmail: originalUser?.email
    });
    
    if (originalUser) {
      fetchPortfolioData(false);
    }
  }, [originalUser]);

  useEffect(() => {
    if (!originalUser) return;

    const interval = setInterval(() => {
      fetchPortfolioData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [originalUser]);

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

  const filteredBalances = balances.filter(balance => {
    if (assetType === 'all') return true;
    if (assetType === 'debt') return balance.asset.type === 'debt';
    if (assetType === 'commodities') return balance.asset.type === 'commodity';
    return true;
  });

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
      </div>

      <div className="mt-8 mb-12">
        <div className="bg-dark-2 rounded-lg overflow-hidden">
          {filteredBalances.length > 0 ? (
            <div>
              {/* Table Headers */}
              <div className="grid grid-cols-4 gap-8 p-4 text-light text-base pl-5">
                <div>Name</div>
                <div>Balance</div>
                <div>Current Price</div>
                <div>APR</div>
              </div>
              
              {/* Table Rows */}
              <div>
                {filteredBalances.map((balance) => (
                  <div key={balance.asset_id} className="grid grid-cols-4 gap-8 p-4 items-center hover:bg-light/5">
                    {/* Name Column */}
                    <div className="flex items-center gap-4 pl-1">
                      <img
                        src={balance.asset.main_image}
                        alt={balance.asset.name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="text-lg font-primary text-light">
                          {balance.asset.symbol}
                        </div>
                        <div className="text-sm font-secondary text-light/60">
                          Los Angeles, CA
                        </div>
                      </div>
                    </div>

                    {/* Balance Column */}
                    <div>
                      <div className="text-lg font-primary text-light">
                        {formatCurrency(balance.total_value)}
                      </div>
                      <div className="text-sm font-secondary text-light/60">
                        {balance.balance.toLocaleString()} {balance.asset.symbol}
                      </div>
                    </div>

                    {/* Current Price Column */}
                    <div>
                      <div className="text-lg font-primary text-light">
                        {formatCurrency(balance.asset.price_per_token)}
                      </div>
                    </div>

                    {/* APR Column */}
                    <div>
                      <div className="text-lg font-primary text-light">
                        {balance.asset.type === 'debt'
                          ? `${balance.asset.apr || 0}%`
                          : '10%'
                        }
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

      <div className="pl-1">
        <h2 className="text-xl font-semibold mb-4 text-light">Transaction History</h2>
        <div className="bg-dark-2 rounded-lg overflow-hidden">
          {transactions.length > 0 ? (
            <div>
              <div className="grid grid-cols-5 gap-4 p-4 text-light text-base pl-5">
                <div>Details</div>
                <div>Amount</div>
                <div>Date</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              
              <div className="divide-y divide-[#2A2A2A]">
                {transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className={`grid grid-cols-5 gap-4 p-4 items-center cursor-pointer hover:bg-dark-3/50`}
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
                          {transaction.type === 'buy' ? 'Bought' : 'Sold'} {transaction.asset.symbol}
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
          ) : (
            <div className="p-8 text-center text-light/60">
              <p>No transactions yet. Make your first investment to get started!</p>
            </div>
          )}
        </div>
      </div>

      <OrderDetailPopup
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction!}
      />
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