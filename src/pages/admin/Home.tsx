import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils/formatters';

interface AdminFees {
  asset_symbol: string;
  fee_balance: number;
  usd_value: number;
}

interface Transaction {
  id: string;
  user_id: string;
  asset_id: string;
  type: string;
  amount: number;
  price_per_token: number;
  status: string;
  created_at: string;
  metadata: any;
  user: {
    email: string;
  };
  asset: {
    symbol: string;
  };
}

export const Home: React.FC = () => {
  const [fees, setFees] = useState<AdminFees[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const ITEMS_PER_PAGE = 25;

  const fetchFees = async () => {
    const { data, error } = await adminSupabase.rpc('get_admin_fees');
    if (error) {
      console.error('Error fetching admin fees:', error);
      return;
    }
    setFees(data || []);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data: txData, error: txError } = await adminSupabase
        .from('transactions')
        .select(`
          *,
          assets!transactions_asset_id_fkey (
            symbol
          ),
          profiles!inner (
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(25);

      if (txError) {
        console.error('Error fetching transactions:', txError);
        return;
      }

      console.log('Raw transaction data:', txData);

      const transformedData = (txData || []).map(tx => ({
        ...tx,
        user: { 
          email: tx.profiles?.email || 'N/A' 
        },
        asset: { 
          symbol: tx.assets?.symbol || 'N/A' 
        }
      }));

      setTransactions(transformedData);
      setTotalPages(1); // For now
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Admin Dashboard</h1>

      {/* Fees Section */}
      <div className="bg-dark-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-medium mb-4">Total Fees Collected</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fees.map((fee) => (
            <div key={fee.asset_symbol} className="bg-dark-700 rounded-lg p-4">
              <div className="text-light/60">{fee.asset_symbol}</div>
              <div className="text-xl font-medium">{formatCurrency(fee.usd_value)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-dark-800 rounded-lg p-6">
        <h2 className="text-xl font-medium mb-4">All Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-light/60">
                <th className="p-2">Date</th>
                <th className="p-2">User</th>
                <th className="p-2">Type</th>
                <th className="p-2">Asset</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Fee</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-4">
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-t border-dark-600">
                    <td className="p-2">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-2">{tx.user?.email || 'N/A'}</td>
                    <td className="p-2 capitalize">{tx.type}</td>
                    <td className="p-2">{tx.asset?.symbol || 'N/A'}</td>
                    <td className="p-2">
                      {formatCurrency(tx.amount * tx.price_per_token)}
                    </td>
                    <td className="p-2 capitalize">{tx.status}</td>
                    <td className="p-2">
                      {formatCurrency(tx.metadata?.fee_usd || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 bg-dark-700 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="px-4 py-2 bg-dark-700 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}; 