import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { transactionService } from '../../lib/services/transactionService';
import { supabase } from '../../lib/supabase';
import { Pool } from '../../lib/types/pool';
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
}

interface PoolImpact {
  poolReduction: number;
  userTokens: number;
  pricePerToken: number;
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

  const fetchTransactions = async () => {
    try {
      console.log('Fetching pending transactions...');
      const { data, error } = await adminSupabase
        .from('admin_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }

      console.log('Fetched transactions with payment methods:', 
        data?.map(t => ({
          id: t.id,
          type: t.type,
          payment_method: t.payment_method
        }))
      );
      setTransactions(data || []);
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
          )
        `);
      setPools(poolsData || []);
    };

    fetchPools();
  }, []);

  const handleAction = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        if (!selectedPool) {
          setError('Please select a pool first');
          return;
        }

        if (!adminPrice) {
          setError('Please input price per token');
          return;
        }

        if (!poolImpact) {
          setError('Pool impact calculation failed');
          return;
        }

        setIsSubmitting(true);
        
        const params = {
          transactionId,
          poolId: selectedPool.id,
          pricePerToken: adminPrice,
          poolReduction: poolImpact.poolReduction,
          userTokens: poolImpact.userTokens
        };

        console.log('Starting transaction approval with full params:', params);
        console.log('Pool details:', selectedPool);
        console.log('Pool impact details:', poolImpact);

        try {
          const result = await transactionService.approveSellTransaction(params);
          console.log('Transaction approval result:', result);
          
          console.log('Fetching updated transaction data...');
          await fetchTransactions();
          console.log('Transaction data refreshed');
          
          toast.success('Transaction approved successfully');
        } catch (approvalError) {
          console.error('Detailed error in approval:', approvalError);
          throw approvalError;
        }
      } else {
        await transactionService.rejectTransaction(transactionId);
        await fetchTransactions();
        toast.success('Transaction rejected');
      }
    } catch (err) {
      console.error('Detailed error in handleAction:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process transaction';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy, h:mm a');
  };

  const calculatePoolImpact = (transaction: Transaction, pool: Pool, pricePerToken: number) => {
    const impact: PoolImpact = {
      poolReduction: transaction.amount * pricePerToken,
      userTokens: (transaction.amount * pricePerToken) / pool.main_asset.price_per_token,
      pricePerToken
    };
    setPoolImpact(impact);
  };

  const renderPoolSelection = (transaction: Transaction) => {
    if (transaction.type !== 'sell') return null;

    return (
      <div className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Select Pool for Payment
          </label>
          <select
            className="w-full bg-[#1A1A1A] text-light rounded-lg p-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedPool?.id || ''}
            onChange={(e) => {
              const pool = pools.find(p => p.id === e.target.value);
              setSelectedPool(pool || null);
              if (pool && adminPrice) {
                calculatePoolImpact(transaction, pool, adminPrice);
              }
            }}
          >
            <option value="" className="bg-[#1A1A1A]">Select a pool</option>
            {pools.map(pool => (
              <option key={pool.id} value={pool.id} className="bg-[#1A1A1A]">
                {pool.type === 'bitcoin' ? 'Bitcoin' : 'Honey'} Pool - TVL: {formatCurrency(pool.total_value_locked)}
              </option>
            ))}
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
                calculatePoolImpact(transaction, selectedPool, price);
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
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pool TVL Reduction</span>
              <span className="text-light">{formatCurrency(poolImpact.poolReduction)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">User Will Receive</span>
              <span className="text-light">{formatCurrency(poolImpact.poolReduction)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Pool Will Receive</span>
              <span className="text-light">{transaction.amount} {transaction.asset_symbol}</span>
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
          transactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-[2fr,1fr,1fr,1.5fr,1fr,1fr] gap-3 items-center py-3">
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
                <div className="text-light">${(transaction.amount * transaction.price_per_token).toLocaleString()}</div>
                <div className="text-sm text-light/60">
                  {transaction.amount} {transaction.asset_symbol}
                </div>
              </div>
              <div className="text-sm text-light/60">
                {format(new Date(transaction.created_at), 'MMM d, h:mm a')}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleAction(transaction.id, 'approve')}
                  disabled={isSubmitting}
                  className="bg-[#00D54B] text-dark px-3 py-1 rounded-lg text-sm font-medium hover:bg-[#00D54B]/90 disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleAction(transaction.id, 'reject')}
                  className="bg-light/10 text-light px-3 py-1 rounded-lg text-sm font-medium hover:bg-light/20"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {transactions.length > 0 && renderPoolSelection(transactions[0])}
    </div>
  );
}; 