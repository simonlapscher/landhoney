import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { transactionService } from '../../lib/services/transactionService';
import { supabase } from '../../lib/supabase';
import { Pool, PoolType } from '../../lib/types/pool';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';

interface Transaction {
  id: string;
  created_at: string;
  user_id: string;
  asset_id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  amount: number;
  price_per_token: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  asset_name: string;
  asset_symbol: string;
  user_email: string;
  payment_method: 'usd_balance' | 'bank_account' | 'usdc';
  asset_type: 'debt' | 'commodity' | 'cash';
}

interface PoolImpact {
  poolReduction: number;
  userTokens: number;
  pricePerToken: number;
  isBuy: boolean;
  fromPool: number;
  fromOffering: number;
}

interface DatabasePool {
  id: string;
  type: string;
  total_value_locked: number;
  apr: number;
  main_asset: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
  };
  pool_assets: {
    balance: number;
    asset: {
      id: string;
      symbol: string;
      name: string;
      price_per_token: number;
    };
  }[];
}

export const PendingTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [poolImpact, setPoolImpact] = useState<PoolImpact | null>(null);
  const [adminPrice, setAdminPrice] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const fetchTransactions = async () => {
    try {
      console.log('Fetching pending transactions...');
      const { data, error } = await adminSupabase
        .from('admin_transactions')
        .select(`
          *,
          asset:assets (
            type,
            symbol,
            name
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      // Log raw data
      console.log('Raw transaction data:', data);

      // Transform the data to include asset_type at the top level
      const transformedData = data?.map(t => ({
        ...t,
        asset_type: t.asset?.type || 'unknown',
        asset_symbol: t.asset?.symbol || t.asset_symbol,
        asset_name: t.asset?.name || t.asset_name
      })) || [];

      // Log transformed data
      console.log('Transformed transactions:', transformedData);
      
      setTransactions(transformedData);
      setError(null);
    } catch (err) {
      console.error('Error details:', { message: 'Unknown error', error: err });
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    const fetchPools = async () => {
      const { data: poolsData } = await supabase
        .from('pools')
        .select(`
          id,
          type,
          total_value_locked,
          apr,
          main_asset:assets!pools_main_asset_id_fkey (
            id,
            symbol,
            name,
            price_per_token
          ),
          pool_assets (
            balance,
            asset:assets (
              id,
              symbol,
              name,
              price_per_token
            )
          )
        `);

      if (poolsData) {
        // Transform database pools to match our Pool type
        const transformedPools = (poolsData as unknown as DatabasePool[])
          .filter((pool): pool is DatabasePool => {
            if (!pool || !pool.main_asset || !Array.isArray(pool.pool_assets)) {
              console.error('Invalid pool data structure:', pool);
              return false;
            }
            return true;
          })
          .map((pool): Pool => ({
            id: pool.id,
            type: pool.type.toLowerCase() as PoolType,
            mainAssetId: pool.main_asset.id,
            apr: pool.apr,
            maxSize: 0, // Set default or fetch from DB
            isPaused: false, // Set default or fetch from DB
            totalValueLocked: pool.total_value_locked,
            createdAt: new Date().toISOString(), // Set default or fetch from DB
            updatedAt: new Date().toISOString(), // Set default or fetch from DB
            main_asset: {
              id: pool.main_asset.id,
              symbol: pool.main_asset.symbol,
              name: pool.main_asset.name,
              price_per_token: pool.main_asset.price_per_token
            },
            pool_assets: pool.pool_assets.map(pa => ({
              balance: pa.balance,
              asset: {
                id: pa.asset.id,
                symbol: pa.asset.symbol,
                name: pa.asset.name,
                price_per_token: pa.asset.price_per_token
              }
            }))
          }));
        
        setPools(transformedPools);
      }
    };

    fetchPools();
  }, []);

  const handleAction = async (action: 'approve' | 'reject', transaction: Transaction) => {
    try {
      if (action === 'approve') {
        // Add debug logging
        console.log('Transaction details:', {
          id: transaction.id,
          asset_symbol: transaction.asset_symbol,
          asset_type: transaction.asset_type,
          type: transaction.type,
          isDirectAsset: ['BTC', 'HONEY'].includes(transaction.asset_symbol),
          isDebtAsset: transaction.asset_type === 'debt'
        });

        // Handle deposits and withdrawals separately
        if (transaction.type === 'deposit' || transaction.type === 'withdraw') {
          await transactionService.approveDepositWithdrawal({
            transactionId: transaction.id,
            pricePerToken: transaction.price_per_token,
            amount: transaction.amount
          });
          await fetchTransactions();
          toast.success('Transaction approved successfully');
          setSelectedTransaction(null);
          return;
        }

        const isDirectAsset = ['BTC', 'HONEY'].includes(transaction.asset_symbol);
        const isDebtAsset = transaction.asset_type === 'debt';
        const availablePools = findAvailablePools(transaction);
        const hasAvailablePools = availablePools.length > 0;

        // For direct assets and deposits/withdrawals, use transaction price
        // If adminPrice is not set, use transaction price as fallback
        const finalPrice = adminPrice || transaction.price_per_token;

        // Handle direct assets (BTC/HONEY)
        if (isDirectAsset) {
          if (transaction.type === 'buy') {
            await transactionService.approveBuyTransaction({
              transactionId: transaction.id,
              poolId: null,
              pricePerToken: finalPrice,
              paymentAmount: transaction.amount
            });
          } else {
            await transactionService.approveSellTransaction({
              transactionId: transaction.id,
              poolId: null,
              pricePerToken: finalPrice,
              poolReduction: 0,
              userTokens: transaction.amount
            });
          }
          await fetchTransactions();
          toast.success('Transaction approved successfully');
          setSelectedTransaction(null);
          return;
        }

        // For debt assets
        if (isDebtAsset) {
          // For sell transactions, always require pool selection
          if (transaction.type === 'sell' && !selectedPool?.id) {
            throw new Error('Please select a pool for the debt asset');
          }
          
          // For buy transactions, only require pool selection if pools are available
          if (transaction.type === 'buy' && hasAvailablePools && !selectedPool?.id) {
            throw new Error('Please select a pool to buy the debt asset from');
          }

          if (transaction.type === 'buy') {
            await transactionService.approveBuyTransaction({
              transactionId: transaction.id,
              poolId: hasAvailablePools && selectedPool ? selectedPool.id : null,
              pricePerToken: finalPrice,
              paymentAmount: transaction.amount
            });
          } else {
            await transactionService.approveSellTransaction({
              transactionId: transaction.id,
              poolId: selectedPool ? selectedPool.id : null,
              pricePerToken: finalPrice,
              poolReduction: poolImpact?.poolReduction || 0,
              userTokens: transaction.amount
            });
          }
          await fetchTransactions();
          toast.success('Transaction approved successfully');
          setSelectedTransaction(null);
          return;
        }
      } else {
        setIsSubmitting(true);
        await transactionService.rejectTransaction(transaction.id);
        if (selectedTransaction?.id === transaction.id) {
          setSelectedTransaction(null);
        }
        await fetchTransactions();
        toast.success('Transaction rejected');
      }
    } catch (err) {
      console.error('Detailed error in handleAction:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to process transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy, h:mm a');
  };

  const calculatePoolImpact = (
    transaction: Transaction, 
    pool: Pool, 
    pricePerToken: number, 
    fromPool: number, 
    fromOffering: number
  ) => {
    // Early return if no main asset
    if (!pool.main_asset) {
      console.error('Pool main asset is missing');
      return;
    }

    // At this point, we know main_asset exists and has all required properties
    const mainAsset = pool.main_asset as Required<NonNullable<Pool['main_asset']>>;

    // Calculate the total payment amount
    const paymentAmount = transaction.amount * pricePerToken;

    // For sell transactions, calculate how much of the main asset (BTC/HONEY) the pool needs to pay
    const mainAssetAmount = transaction.type === 'sell' 
      ? paymentAmount / mainAsset.price_per_token
      : fromPool * pricePerToken;

    const impact: PoolImpact = {
      poolReduction: mainAssetAmount,
      userTokens: mainAssetAmount,
      pricePerToken,
      isBuy: transaction.type === 'buy',
      fromPool,
      fromOffering
    };

    setPoolImpact(impact);
  };

  const findAvailablePools = (transaction: Transaction): Pool[] => {
    // For sell transactions of debt assets, return all pools
    if (transaction.type === 'sell' && transaction.asset_type === 'debt') {
      return pools;
    }
    
    // For buy transactions of debt assets, return pools that have the asset
    if (transaction.type === 'buy' && transaction.asset_type === 'debt') {
      return pools.filter(pool => 
        pool.pool_assets?.some(pa => 
          pa.asset.symbol === transaction.asset_symbol && pa.balance > 0
        )
      );
    }
    
    // For direct assets (BTC/HONEY), no pools needed
    return [];
  };

  const renderTransactionRow = (transaction: Transaction) => (
    <>
      <div 
        key={transaction.id} 
        className={`grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,1fr] gap-3 items-center py-3 cursor-pointer hover:bg-light/5 ${
          selectedTransaction?.id === transaction.id ? 'bg-light/10' : ''
        }`}
        onClick={() => setSelectedTransaction(transaction)}
      >
        <div className="text-light">{transaction.user_email}</div>
        <div className="capitalize">
          {transaction.type === 'deposit' ? (
            <span className="text-[#00D897]">Deposit</span>
          ) : transaction.type === 'withdraw' ? (
            <span className="text-yellow-500">Withdraw</span>
          ) : (
            <div>
              <span>{transaction.type}</span>
              {transaction.type === 'buy' && (
                <div className="text-xs text-light/60 mt-0.5">
                  {transaction.payment_method === 'usd_balance' ? 'USD Balance' :
                   transaction.payment_method === 'bank_account' ? 'Bank Account' : 
                   'USDC'}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="text-light">{transaction.asset_symbol}</div>
        <div>
          <div className="text-light">
            ${(transaction.amount * (
              transaction.type === 'sell' && transaction.asset_symbol === 'BTC' 
                ? transaction.price_per_token 
                : transaction.price_per_token
            )).toLocaleString()}
          </div>
          <div className="text-sm text-light/60">
            {transaction.amount} {transaction.asset_symbol}
          </div>
        </div>
        <div className="text-sm text-light/60">
          {format(new Date(transaction.created_at), 'MMM d, h:mm a')}
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('approve', transaction);
            }}
            disabled={isSubmitting}
            className="bg-[#00D54B] text-dark px-3 py-1 rounded-lg text-sm font-medium hover:bg-[#00D54B]/90 disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction('reject', transaction);
            }}
            className="bg-light/10 text-light px-3 py-1 rounded-lg text-sm font-medium hover:bg-light/20"
          >
            Reject
          </button>
        </div>
      </div>
      {selectedTransaction?.id === transaction.id && (
        <div className="bg-dark-2 p-4 rounded-lg mb-4">
          {renderPoolSelection(selectedTransaction)}
        </div>
      )}
    </>
  );

  const renderPoolSelection = (transaction: Transaction) => {
    if (!transaction) return null;

    // Add debug logging
    console.log('renderPoolSelection - Transaction:', {
      id: transaction.id,
      asset_symbol: transaction.asset_symbol,
      asset_type: transaction.asset_type,
      type: transaction.type
    });

    // For deposits and withdrawals, only show approval button, no pool or price needed
    if (transaction.type === 'deposit' || transaction.type === 'withdraw') {
      return null;
    }

    const isDirectAsset = ['BTC', 'HONEY'].includes(transaction.asset_symbol);
    const isDebtAsset = transaction.asset_type === 'debt';
    const availablePools = findAvailablePools(transaction);
    const hasAvailablePools = availablePools.length > 0;

    // Add debug logging for asset type checks
    console.log('Asset type checks:', {
      isDirectAsset,
      isDebtAsset,
      hasAvailablePools,
      asset_type: transaction.asset_type,
      asset_symbol: transaction.asset_symbol
    });

    // For BTC/HONEY transactions, only show price input
    if (isDirectAsset) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-yellow-500 mb-4">
            Direct asset transaction. No pool selection needed.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Input Agreed Price per Token
            </label>
            <input
              type="number"
              className="w-full bg-[#1A1A1A] text-light rounded-lg p-2 border border-gray-700"
              value={adminPrice || transaction.price_per_token || ''}
              onChange={(e) => setAdminPrice(parseFloat(e.target.value))}
              placeholder="Enter price per token"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      );
    }

    // For debt assets without available pools, show direct listing UI
    if (isDebtAsset && !hasAvailablePools) {
      return (
        <div className="space-y-4">
          <div className="text-sm text-yellow-500 mb-4">
            No pools have this asset. Transaction will be processed as a direct offering.
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Input Agreed Price per Token
            </label>
            <input
              type="number"
              className="w-full bg-[#1A1A1A] text-light rounded-lg p-2 border border-gray-700"
              value={adminPrice || transaction.price_per_token || ''}
              onChange={(e) => setAdminPrice(parseFloat(e.target.value))}
              placeholder="Enter price per token"
              min="0"
              step="0.01"
            />
          </div>
        </div>
      );
    }

    // For debt assets with available pools, show pool selection
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Pool for {transaction.type === 'buy' ? 'Asset Source' : 'Payment'}
          </label>
          <select
            className="w-full bg-[#1A1A1A] text-light rounded-lg p-2 border border-gray-700"
            value={selectedPool?.id || ''}
            onChange={(e) => {
              const pool = pools.find(p => p.id === e.target.value);
              setSelectedPool(pool || null);
              
              if (pool && adminPrice) {
                const poolAsset = pool.pool_assets?.find(pa => 
                  pa.asset.id === transaction.asset_id
                );
                
                const availableInPool = Number(poolAsset?.balance) || 0;
                const transactionAmount = Number(transaction.amount) || 0;
                
                const fromPool = Math.min(availableInPool, transactionAmount);
                const fromOffering = Math.max(0, transactionAmount - fromPool);
                
                calculatePoolImpact(transaction, pool, adminPrice, fromPool, fromOffering);
              }
            }}
          >
            <option value="">Select a pool</option>
            {availablePools.map(pool => {
              const poolAsset = pool.pool_assets?.find(pa => 
                pa.asset.id === transaction.asset_id
              );
              const availableAmount = poolAsset?.balance || 0;
              return (
                <option key={pool.id} value={pool.id}>
                  {pool.type === 'bitcoin' ? 'Bitcoin' : 'Honey'} Pool 
                  (Has {availableAmount} {transaction.asset_symbol})
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Input Agreed Price per Token
          </label>
          <input
            type="number"
            className="w-full bg-[#1A1A1A] text-light rounded-lg p-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            value={adminPrice || ''}
            onChange={(e) => {
              const price = parseFloat(e.target.value);
              setAdminPrice(price);
              if (selectedPool && !isNaN(price)) {
                const poolAsset = selectedPool.pool_assets?.find(pa => 
                  pa.asset.id === transaction.asset_id
                );
                const availableInPool = Number(poolAsset?.balance) || 0;
                const transactionAmount = Number(transaction.amount) || 0;
                const fromPool = Math.min(availableInPool, transactionAmount);
                const fromOffering = Math.max(0, transactionAmount - fromPool);
                calculatePoolImpact(transaction, selectedPool, price, fromPool, fromOffering);
              }
            }}
            placeholder="Enter price per token"
            min="0"
            step="0.01"
          />
        </div>

        {poolImpact && selectedPool && (
          <div className="bg-dark-3 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-light">Transaction Impact Preview</h4>
            <div className="text-sm space-y-2">
              <div className="text-gray-400">Pool Balances:</div>
              {transaction.type === 'buy' ? (
                <>
                  {selectedPool.main_asset && (
                    <div className="flex justify-between items-center">
                      <span className="text-green-400">
                        + {formatCurrency(poolImpact.poolReduction)} in {selectedPool.main_asset.symbol}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-red-400">
                      - {Number(poolImpact.fromPool).toLocaleString()} {transaction.asset_symbol}
                    </span>
                  </div>
                  {poolImpact.fromOffering > 0 && (
                    <div className="mt-2">
                      <div className="text-gray-400">From Direct Offering:</div>
                      <div className="flex justify-between items-center">
                        <span className="text-blue-400">
                          + {Number(poolImpact.fromOffering).toLocaleString()} {transaction.asset_symbol}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">
                      + {transaction.amount} {transaction.asset_symbol} 
                      {adminPrice !== null && (
                        <> (+{formatCurrency(transaction.amount * adminPrice)} USD)</>
                      )}
                    </span>
                  </div>
                  {selectedPool.main_asset && (
                    <div className="flex justify-between items-center">
                      <span className="text-red-400">
                        - {Number(poolImpact.poolReduction).toFixed(selectedPool.type === 'bitcoin' ? 8 : 2)} {selectedPool.main_asset.symbol} 
                        (-{formatCurrency(poolImpact.poolReduction * selectedPool.main_asset.price_per_token)} USD)
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div>Loading transactions...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Pending Transactions</h1>
      <p className="text-light/60 mb-6">Review and approve pending transactions</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {/* Column Headers */}
        <div className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,1fr] gap-3 text-light/60 text-sm pb-2 border-b border-light/10">
          <div>User</div>
          <div>Type</div>
          <div>Asset</div>
          <div>Amount</div>
          <div>Date</div>
          <div className="text-right">Actions</div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center text-light/60 py-8">
            No pending transactions
          </div>
        ) : (
          transactions.map(renderTransactionRow)
        )}
      </div>
    </div>
  );
}; 