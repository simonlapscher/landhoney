import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { Button } from '../../components/common/Button';

interface Transaction {
  id: string;
  created_at: string;
  user_id: string;
  asset_id: string;
  type: 'buy' | 'sell';
  amount: number;
  price_per_token: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  asset: {
    name: string;
    symbol: string;
  };
  user: {
    email: string;
  };
}

export const PendingTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const fetchTransactions = async () => {
    try {
      console.log('Fetching transactions...');
      const { data: transactionData, error: fetchError } = await supabase
        .from('admin_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching transactions:', fetchError);
        throw fetchError;
      }
      
      console.log('Transactions fetched:', transactionData);
      
      // Transform the data to match our expected format
      const transactions = (transactionData || []).map(t => ({
        ...t,
        asset: {
          name: t.asset_name,
          symbol: t.asset_symbol
        },
        user: {
          email: t.user_email
        }
      }));

      console.log('Transformed transaction data:', transactions);
      setTransactions(transactions);
    } catch (err) {
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        error: err
      });
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAction = async (transactionId: string, action: 'approve' | 'reject') => {
    if (processingIds.has(transactionId)) return;
    
    setProcessingIds(prev => new Set(Array.from(prev).concat(transactionId)));
    
    try {
      const transaction = transactions.find(t => t.id === transactionId);
      if (!transaction) throw new Error('Transaction not found');

      // Start a Supabase transaction
      const { error: updateError } = await supabase.rpc('process_transaction', {
        p_transaction_id: transactionId,
        p_action: action,
      });

      if (updateError) throw updateError;

      // Refresh the transactions list
      await fetchTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process transaction');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(Array.from(prev));
        next.delete(transactionId);
        return next;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-dark-3 rounded w-1/4"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-dark-3 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-light">Pending Transactions</h1>
        <p className="mt-1 text-light/60">Review and approve pending transactions</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-md p-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      <div className="bg-dark-2 rounded-lg overflow-hidden">
        {transactions.length > 0 ? (
          <div>
            {/* Headers */}
            <div className="grid grid-cols-6 gap-4 p-4 text-light/60 border-b border-dark-3">
              <div>User</div>
              <div>Type</div>
              <div>Asset</div>
              <div>Amount</div>
              <div>Date</div>
              <div>Actions</div>
            </div>

            {/* Transactions */}
            <div className="divide-y divide-dark-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="grid grid-cols-6 gap-4 p-4 items-center">
                  <div className="text-light">
                    {transaction.user.email}
                  </div>
                  <div className="text-light capitalize">
                    {transaction.type}
                  </div>
                  <div className="text-light">
                    {transaction.asset.symbol}
                  </div>
                  <div>
                    <div className="text-light">
                      {formatCurrency(transaction.amount * transaction.price_per_token)}
                    </div>
                    <div className="text-sm text-light/60">
                      {transaction.amount} {transaction.asset.symbol}
                    </div>
                  </div>
                  <div className="text-light">
                    {formatDate(transaction.created_at)}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="!bg-[#00D897] hover:!bg-[#00C085]"
                      loading={processingIds.has(transaction.id)}
                      onClick={() => handleAction(transaction.id, 'approve')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="!bg-[#3A3A3A] hover:!bg-[#454545] !text-light"
                      loading={processingIds.has(transaction.id)}
                      onClick={() => handleAction(transaction.id, 'reject')}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-light/60">
            No pending transactions to review
          </div>
        )}
      </div>
    </div>
  );
}; 