import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';
import { format } from 'date-fns';

interface Payout {
  payment_id: string;
  payment_date: string;
  user_email: string;
  usd_amount: number;
  honey_amount: number;
  days_held_in_period: number;
  average_balance: number;
  distribution_period_start: string;
  distribution_period_end: string;
  asset_name: string;
  asset_symbol: string;
  asset_type: string;
  loan_amount: number;
  apr: number;
}

interface Asset {
  id: string;
  name: string;
  symbol: string;
}

interface Analytics {
  totalUsdAmount: number;
  totalHoneyAmount: number;
  totalPayouts: number;
  uniqueUsers: number;
}

export const PayoutHistory: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalUsdAmount: 0,
    totalHoneyAmount: 0,
    totalPayouts: 0,
    uniqueUsers: 0
  });

  // Filter states
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Fetch assets on component mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await adminSupabase
          .from('assets')
          .select('id, name, symbol')
          .eq('type', 'debt');

        if (error) throw error;
        setAssets(data || []);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Failed to load assets');
      }
    };

    fetchAssets();
  }, []);

  // Calculate analytics from filtered payouts
  const calculateAnalytics = (payouts: Payout[]) => {
    const uniqueUsers = new Set(payouts.map(p => p.user_email)).size;
    
    setAnalytics({
      totalUsdAmount: payouts.reduce((sum, p) => sum + p.usd_amount, 0),
      totalHoneyAmount: payouts.reduce((sum, p) => sum + p.honey_amount, 0),
      totalPayouts: payouts.length,
      uniqueUsers
    });
  };

  // Update fetchPayouts to calculate analytics
  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = adminSupabase
        .from('admin_payouts_view')
        .select('*')
        .order('payment_date', { ascending: false });

      if (selectedAsset) {
        query = query.eq('asset_id', selectedAsset);
      }

      if (userEmail) {
        query = query.ilike('user_email', `%${userEmail}%`);
      }

      if (startDate) {
        query = query.gte('payment_date', startDate);
      }

      if (endDate) {
        query = query.lte('payment_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      const payoutData = data || [];
      setPayouts(payoutData);
      calculateAnalytics(payoutData);
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch payouts when filters change
  useEffect(() => {
    fetchPayouts();
  }, [selectedAsset, userEmail, startDate, endDate]);

  if (loading && !payouts.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-light">Payout History</h1>
        <p className="text-light/60">View and filter all loan distribution payouts</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-dark-2 rounded-lg p-6">
          <h3 className="text-light/60 mb-2">Total USD Distributed</h3>
          <p className="text-2xl font-semibold text-light">
            {formatCurrency(analytics.totalUsdAmount)}
          </p>
        </div>
        <div className="bg-dark-2 rounded-lg p-6">
          <h3 className="text-light/60 mb-2">Total HONEY Distributed</h3>
          <p className="text-2xl font-semibold text-light">
            {analytics.totalHoneyAmount.toFixed(4)} HONEY
          </p>
        </div>
        <div className="bg-dark-2 rounded-lg p-6">
          <h3 className="text-light/60 mb-2">Total Payouts</h3>
          <p className="text-2xl font-semibold text-light">
            {analytics.totalPayouts}
          </p>
        </div>
        <div className="bg-dark-2 rounded-lg p-6">
          <h3 className="text-light/60 mb-2">Unique Users</h3>
          <p className="text-2xl font-semibold text-light">
            {analytics.uniqueUsers}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-2 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 text-light">Filters</h2>
        
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-light/60 mb-2">Asset</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              <option value="">All Assets</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-light/60 mb-2">User Email</label>
            <input
              type="text"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="Search by email"
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          </div>

          <div>
            <label className="block text-light/60 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          </div>

          <div>
            <label className="block text-light/60 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-dark-2 rounded-lg p-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-light/60 border-b border-light/10">
                <th className="text-left py-4">Date</th>
                <th className="text-left py-4">User</th>
                <th className="text-left py-4">Asset</th>
                <th className="text-right py-4">USD Amount</th>
                <th className="text-right py-4">HONEY Amount</th>
                <th className="text-right py-4">Days Held</th>
                <th className="text-right py-4">Average Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light/10">
              {payouts.map((payout) => (
                <tr key={payout.payment_id}>
                  <td className="py-4 text-light">
                    {format(new Date(payout.payment_date), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 text-light">{payout.user_email}</td>
                  <td className="py-4 text-light">
                    {payout.asset_name} ({payout.asset_symbol})
                  </td>
                  <td className="py-4 text-right text-light">
                    {formatCurrency(payout.usd_amount)}
                  </td>
                  <td className="py-4 text-right text-light">
                    {payout.honey_amount.toFixed(4)} HONEY
                  </td>
                  <td className="py-4 text-right text-light">
                    {payout.days_held_in_period}
                  </td>
                  <td className="py-4 text-right text-light">
                    {formatCurrency(payout.average_balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 