import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { Button } from '../common/Button';
import { useNavigate } from 'react-router-dom';
import { OrderDetailPopup } from './OrderDetailPopup';

interface Transaction {
  id: string;
  created_at: string;
  asset_id: string;
  type: 'buy' | 'sell';
  amount: number;
  price_per_token: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  asset: {
    name: string;
    symbol: string;
    main_image: string;
  };
}

interface Balance {
  asset_id: string;
  balance: number;
  total_value: number;
  asset: {
    name: string;
    symbol: string;
    main_image: string;
    price_per_token: number;
  };
}

export const Portfolio: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        // Fetch user's transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select(`
            *,
            asset:assets(name, symbol, main_image)
          `)
          .order('created_at', { ascending: false });

        if (transactionsError) throw transactionsError;

        // Fetch user's balances with current value
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_balances_with_value')
          .select(`
            *,
            asset:assets(name, symbol, main_image, price_per_token)
          `)
          .gt('balance', 0);

        if (balancesError) throw balancesError;

        setTransactions(transactionsData);
        setBalances(balancesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolioData();
  }, []);

  const totalPortfolioValue = balances.reduce((sum, balance) => sum + Number(balance.total_value), 0);

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
    // Check if the click was on a button or its parent
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setSelectedTransaction(transaction);
  };

  if (loading) {
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
      {/* Portfolio Value */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-light">Portfolio</h1>
        <p className="mt-2 text-2xl font-medium text-light">
          Total Value: {formatCurrency(totalPortfolioValue)}
        </p>
      </div>

      {/* Holdings */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-light">Your Holdings</h2>
        <div className="bg-dark-2 rounded-lg overflow-hidden">
          {balances.length > 0 ? (
            <div className="divide-y divide-dark-3">
              {balances.map((balance) => (
                <div key={balance.asset_id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={balance.asset.main_image}
                      alt={balance.asset.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-medium text-light">{balance.asset.name}</h3>
                      <p className="text-sm text-light/60">
                        {balance.balance} {balance.asset.symbol}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-light">
                      {formatCurrency(Number(balance.total_value))}
                    </p>
                    <p className="text-sm text-light/60">
                      {formatCurrency(Number(balance.asset.price_per_token))} per token
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-light/60">
              <p>No holdings yet. Start investing to build your portfolio!</p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction History */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-light">Transaction History</h2>
        <div className="bg-dark-2 rounded-lg overflow-hidden">
          {transactions.length > 0 ? (
            <div>
              {/* Column Headers */}
              <div className="grid grid-cols-5 gap-4 p-4 text-light text-base">
                <div>Details</div>
                <div>Amount</div>
                <div>Date</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              
              {/* Transactions */}
              <div className="divide-y divide-[#2A2A2A]">
                {transactions.map((transaction, index) => (
                  <div
                    key={transaction.id}
                    className={`grid grid-cols-5 gap-4 p-4 items-center cursor-pointer hover:bg-dark-3/50`}
                    onClick={(e) => handleTransactionClick(transaction, e)}
                  >
                    {/* Details Column */}
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

                    {/* Amount Column */}
                    <div>
                      <p className="text-[#00D897] font-medium">
                        {formatCurrency(transaction.amount * transaction.price_per_token)}
                      </p>
                      <p className="text-sm text-light/60">
                        {transaction.amount} {transaction.asset.symbol}
                      </p>
                    </div>

                    {/* Date Column */}
                    <div className="text-light">
                      {formatDate(transaction.created_at)}
                    </div>

                    {/* Status Column */}
                    <div className="flex items-center text-light">
                      {getStatusDot(transaction.status)}
                      <span className="capitalize">{transaction.status}</span>
                    </div>

                    {/* Actions Column */}
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

      {/* Order Detail Popup */}
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