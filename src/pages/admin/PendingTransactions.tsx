import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { transactionService } from '../../lib/services/transactionService';

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

export const PendingTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleAction = async (transactionId: string, action: 'approve' | 'reject') => {
    try {
      console.log('Processing transaction:', { transactionId, action });
      
      if (action === 'approve') {
        // Get the transaction details
        const transaction = transactions.find(t => t.id === transactionId);
        if (!transaction) throw new Error('Transaction not found');

        if (transaction.payment_method === 'usd_balance') {
          // Use special handler for USD balance orders
          await transactionService.approveUsdBalanceOrder(transactionId);
        } else {
          // Use regular approval for bank and USDC orders
          const { error } = await adminSupabase.rpc('process_transaction', {
            p_transaction_id: transactionId,
            p_action: action
          });
          if (error) throw error;
        }
      } else {
        // Handle rejection normally
        const { error } = await adminSupabase.rpc('process_transaction', {
          p_transaction_id: transactionId,
          p_action: action
        });
        if (error) throw error;
      }

      // Refresh the transactions list
      await fetchTransactions();
    } catch (err) {
      console.error('Failed to process transaction:', err);
      setError('Failed to process transaction');
    }
  };

  const handleApprove = async (transaction: Transaction) => {
    try {
      if (transaction.payment_method === 'usd_balance') {
        await transactionService.approveUsdBalanceOrder(transaction.id);
      } else {
        await transactionService.approveOrder(transaction.id);
      }
      // ... rest of approval logic
    } catch (err) {
      console.error('Error approving transaction:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy, h:mm a');
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
                  className="bg-[#00D54B] text-dark px-3 py-1 rounded-lg text-sm font-medium hover:bg-[#00D54B]/90"
                >
                  Approve
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
    </div>
  );
}; 