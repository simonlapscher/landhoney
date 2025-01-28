import React, { useEffect, useState } from 'react';
import { useUser } from '../../hooks/useUser';
import { transactionService } from '../../lib/services/transactionService';
import { Transaction } from '../../lib/types/transaction';
import { format } from 'date-fns';
import { Tooltip } from '../common/Tooltip';
import { InformationCircleIcon } from '@heroicons/react/24/solid';

export const TransactionHistory: React.FC = () => {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await transactionService.getUserTransactions(user.id);
        setTransactions(data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError('Failed to load transaction history');
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [user]);

  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'text-[#00D54B]';
      case 'pending':
        return 'text-yellow-500';
      case 'failed':
        return 'text-tertiary-pink';
      default:
        return 'text-light/60';
    }
  };

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending Payment';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return <div className="text-center text-light/60">Loading transactions...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
        {error}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center text-light/60">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-light">Transaction History</h2>
      
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="bg-light/5 p-4 rounded-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-light font-medium">
                  {transaction.type === 'buy' ? 'Buy' : 'Sell'} {transaction.amount.toFixed(2)} tokens
                </span>
                <div className="text-sm text-light/60">
                  {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div className="text-right">
                <div className="text-light">${(transaction.amount * transaction.price_per_token).toFixed(2)}</div>
                <div className={`text-sm ${getStatusColor(transaction.status)}`}>
                  {getStatusText(transaction.status)}
                </div>
              </div>
            </div>

            {transaction.status === 'pending' && transaction.metadata?.payment_method && (
              <div className="text-sm text-light/60">
                <div className="flex items-center gap-1">
                  <span>Payment Reference:</span>
                  <span className="font-mono">{transaction.metadata.reference}</span>
                  <Tooltip content="Use this reference when making your payment">
                    <InformationCircleIcon className="w-4 h-4" />
                  </Tooltip>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 