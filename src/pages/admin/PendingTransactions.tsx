import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  created_at: string;
  user_id: string;
  asset_id: string;
  type: 'buy' | 'sell';
  amount: number;
  price_per_token: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  asset_name: string;
  asset_symbol: string;
  user_email: string;
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

      console.log('Fetched transactions:', data);
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
      
      const { error } = await adminSupabase.rpc('process_transaction', {
        p_transaction_id: transactionId,
        p_action: action
      });

      if (error) {
        console.error('Error processing transaction:', error);
        throw error;
      }

      // Refresh the transactions list
      await fetchTransactions();
    } catch (err) {
      console.error('Failed to process transaction:', err);
      setError('Failed to process transaction');
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

      <div className="space-y-4">
        <div className="grid grid-cols-12 gap-4 text-light/60 text-sm pb-2 border-b border-light/10">
          <div className="col-span-3">User</div>
          <div className="col-span-1">Type</div>
          <div className="col-span-2">Asset</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-4">Actions</div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center text-light/60 py-8">
            No pending transactions
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="grid grid-cols-12 gap-4 items-center py-4">
              <div className="col-span-3 text-light">{transaction.user_email}</div>
              <div className="col-span-1 capitalize text-light">{transaction.type}</div>
              <div className="col-span-2 text-light">{transaction.asset_symbol}</div>
              <div className="col-span-2">
                <div className="text-light">${transaction.amount.toLocaleString()}</div>
                <div className="text-sm text-light/60">
                  {transaction.amount} {transaction.asset_symbol}
                </div>
              </div>
              <div className="col-span-4 flex items-center justify-between">
                <span className="text-light/60 whitespace-nowrap">
                  {formatDate(transaction.created_at)}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(transaction.id, 'approve')}
                    className="px-3 py-1 bg-[#00D54B] text-dark rounded hover:bg-[#00D54B]/90 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(transaction.id, 'reject')}
                    className="px-3 py-1 bg-[#3A3A3A] text-light/60 rounded hover:bg-[#3A3A3A]/90 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}; 