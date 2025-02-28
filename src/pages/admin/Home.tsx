import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils/formatters';
import { UserBalancesSummary } from '../../components/admin/UserBalancesSummary';

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

interface UserBalance {
  asset_symbol: string;
  asset_name: string;
  balance: number;
  usd_value: number;
}

interface User {
  id: string;
  email: string;
}

export const Home: React.FC = () => {
  const [fees, setFees] = useState<AdminFees[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const ITEMS_PER_PAGE = 25;
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balances, setBalances] = useState<UserBalance[]>([]);

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
      // First get the total count of transactions
      const { count, error: countError } = await adminSupabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Error getting count:', countError);
        return;
      }

      // Calculate total pages
      const totalCount = count || 0;
      const calculatedTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
      setTotalPages(calculatedTotalPages);

      // Get paginated transactions
      const { data: txData, error: txError } = await adminSupabase
        .from('transactions')
        .select(`
          *,
          assets (
            symbol
          )
        `)
        .order('created_at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, (page * ITEMS_PER_PAGE) - 1);

      if (txError) {
        console.error('Error fetching transactions:', txError);
        return;
      }

      // Then let's get user emails in a separate query
      const userIds = Array.from(new Set((txData || []).map(tx => tx.user_id)));
      
      // Use raw query to access auth.users
      const { data: userData, error: userError } = await adminSupabase
        .rpc('get_user_emails', {
          p_user_ids: userIds  // Changed from user_ids to p_user_ids
        });

      if (userError) {
        console.error('Error fetching users:', userError);
        return;
      }

      // Create a map of user IDs to emails with proper typing
      const userMap: Record<string, string> = (userData || []).reduce((acc: Record<string, string>, user: { id: string; email: string }) => {
        acc[user.id] = user.email;
        return acc;
      }, {});

      const transformedData = (txData || []).map(tx => ({
        ...tx,
        user: { 
          email: userMap[tx.user_id as string] || 'N/A' 
        },
        asset: { 
          symbol: tx.assets?.symbol || 'N/A' 
        }
      }));

      setTransactions(transformedData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalances = async (userId?: string) => {
    try {
      console.log('Fetching balances for user:', userId);
      const { data, error } = await adminSupabase
        .from('user_balances_with_value')
        .select(`
          balance,
          symbol,
          name,
          price_per_token,
          total_value
        `)
        .eq('user_id', userId || '')
        .not('balance', 'eq', 0); // Only show non-zero balances

      if (error) {
        console.error('Error fetching balances:', error);
        throw error;
      }
      
      console.log('Raw balance data:', data);
      
      const transformedBalances = data.map(balance => ({
        asset_symbol: balance.symbol,
        asset_name: balance.name,
        balance: parseFloat(balance.balance) || 0,
        usd_value: parseFloat(balance.total_value) || 0
      }));

      console.log('Transformed balances:', transformedBalances);
      setBalances(transformedBalances);
    } catch (err) {
      console.error('Error fetching balances:', err);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearch) {
        setUsers([]);
        return;
      }

      try {
        const { data, error } = await adminSupabase
          .rpc('search_users_by_email', {
            search_term: userSearch
          });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearch(user.email);
    setUsers([]);
    fetchUserBalances(user.id);
  };

  const handleClearFilter = () => {
    setSelectedUser(null);
    setUserSearch('');
    fetchUserBalances();
  };

  return (
    <div className="space-y-8">
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

        {/* Platform Balances Section */}
        <div className="bg-dark-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-medium">Platform Balances</h2>
            
            {/* User Search */}
            <div className="relative w-96">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  if (!e.target.value) {
                    setSelectedUser(null);
                    fetchUserBalances();
                  }
                }}
                placeholder="Filter by user email"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
                style={{ backgroundColor: '#1a1a1a' }}
              />
              {users.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-dark-800 rounded-lg overflow-hidden shadow-lg border border-dark-600">
                  {users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="w-full px-3 py-2 text-left text-light hover:bg-dark-700 transition-colors"
                      style={{ backgroundColor: '#1a1a1a' }}
                    >
                      {user.email}
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <button
                  onClick={handleClearFilter}
                  className="absolute right-2 top-2 text-light/60 hover:text-light"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-light/60">
                  <th className="p-2">Asset</th>
                  <th className="p-2 text-right">Total Balance</th>
                  <th className="p-2 text-right">USD Value</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((balance) => (
                  <tr key={balance.asset_symbol} className="border-t border-dark-600">
                    <td className="p-2">
                      <div className="text-light">{balance.asset_symbol}</div>
                      <div className="text-sm text-light/60">{balance.asset_name}</div>
                    </td>
                    <td className="p-2 text-right">{balance.balance.toFixed(8)}</td>
                    <td className="p-2 text-right">{formatCurrency(balance.usd_value)}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="border-t border-dark-600 font-semibold">
                  <td className="p-2">Total</td>
                  <td className="p-2"></td>
                  <td className="p-2 text-right">
                    {formatCurrency(balances.reduce((sum, balance) => sum + (balance.usd_value || 0), 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Add the new balances summary */}
        <UserBalancesSummary />
      </div>
    </div>
  );
}; 