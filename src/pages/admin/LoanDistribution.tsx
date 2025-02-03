import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/format';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: string;
}

interface UserHolding {
  user_id: string;
  user_email: string;
  average_balance: number;
  days_held: number;
  calculated_usd_amount: number;
  calculated_honey_amount: number;
}

interface DistributionAnalytics {
  total_usd_distributed: number;
  total_honey_distributed: number;
  total_investors_paid: number;
}

interface TimeFilter {
  label: string;
  months: number;
}

interface Holding {
  user_id: string;
  average_balance: number;
  days_held: number;
}

interface User {
  id: string;
  email: string;
}

export const LoanDistribution: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [distributionAmount, setDistributionAmount] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [userHoldings, setUserHoldings] = useState<UserHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeyPrice, setHoneyPrice] = useState<number>(0);
  const [analytics, setAnalytics] = useState<DistributionAnalytics | null>(null);
  const [timeFilter, setTimeFilter] = useState<number>(1); // Default to 1 month

  const timeFilters: TimeFilter[] = [
    { label: 'This Month', months: 1 },
    { label: 'Past 3 Months', months: 3 },
    { label: 'Past 6 Months', months: 6 },
    { label: 'Past Year', months: 12 },
    { label: 'All Time', months: 0 }
  ];

  // Fetch assets and Honey price on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch debt assets
        const { data: assetsData, error: assetsError } = await adminSupabase
          .from('assets')
          .select('id, name, symbol, type')
          .eq('type', 'debt');

        if (assetsError) throw assetsError;
        setAssets(assetsData);

        // Fetch current Honey price
        const { data: honeyData, error: honeyError } = await adminSupabase
          .from('assets')
          .select('price_per_token')
          .eq('symbol', 'HONEY')
          .single();

        if (honeyError) throw honeyError;
        setHoneyPrice(honeyData.price_per_token);

        // Fetch analytics
        await fetchAnalytics(1); // Default to 1 month

      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const fetchAnalytics = async (months: number) => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      if (months > 0) {
        startDate.setMonth(startDate.getMonth() - months);
      }

      const { data, error } = await adminSupabase
        .from('loan_distribution_payments')
        .select('usd_amount, honey_amount, user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      const uniqueUsers = new Set(data.map(payment => payment.user_id));
      
      setAnalytics({
        total_usd_distributed: data.reduce((sum, payment) => sum + payment.usd_amount, 0),
        total_honey_distributed: data.reduce((sum, payment) => sum + payment.honey_amount, 0),
        total_investors_paid: uniqueUsers.size
      });

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics');
    }
  };

  const calculateDistribution = async () => {
    if (!selectedAsset || !distributionAmount || !periodStart || !periodEnd) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setCalculating(true);
      setError(null);

      console.log('Calculation params:', {
        asset_id: selectedAsset,
        start_date: new Date(periodStart + 'T00:00:00Z').toISOString(),
        end_date: new Date(periodEnd + 'T23:59:59Z').toISOString(),
        amount: distributionAmount
      });

      // Calculate user holdings for the period
      const { data: holdings, error: holdingsError } = await adminSupabase
        .rpc('calculate_user_holdings', {
          p_asset_id: selectedAsset,
          p_start_date: new Date(periodStart + 'T00:00:00Z').toISOString(),
          p_end_date: new Date(periodEnd + 'T23:59:59Z').toISOString()
        });

      if (holdingsError) {
        console.error('Holdings calculation error:', holdingsError);
        throw holdingsError;
      }

      console.log('Holdings calculated:', holdings);

      if (!holdings || holdings.length === 0) {
        setError('No holdings found for the selected period');
        return;
      }

      // Get user emails
      const userIds = holdings.map((h: Holding) => h.user_id);
      console.log('Fetching emails for users:', userIds);

      // Using raw query to access auth.users table
      const { data: users, error: usersError } = await adminSupabase
        .rpc('get_user_emails', {
          p_user_ids: userIds
        });

      if (usersError) {
        console.error('Error fetching user emails:', usersError);
        throw usersError;
      }

      console.log('Users fetched:', users);

      // Calculate distribution amounts
      const totalDays = holdings.reduce((sum: number, h: Holding) => sum + h.days_held, 0);
      const totalBalance = holdings.reduce((sum: number, h: Holding) => sum + h.average_balance, 0);
      const distributionAmountNum = parseFloat(distributionAmount);

      console.log('Distribution totals:', {
        totalDays,
        totalBalance,
        distributionAmount: distributionAmountNum,
        honeyPrice
      });

      const holdingsWithAmounts = holdings.map((holding: Holding) => {
        const user = users?.find((u: User) => u.id === holding.user_id);
        const weight = (holding.average_balance * holding.days_held) / (totalBalance * totalDays);
        const usdAmount = distributionAmountNum * weight;
        const honeyAmount = usdAmount / honeyPrice;

        return {
          user_id: holding.user_id,
          user_email: user?.email || 'Unknown',
          average_balance: holding.average_balance,
          days_held: holding.days_held,
          calculated_usd_amount: usdAmount,
          calculated_honey_amount: honeyAmount
        };
      });

      console.log('Final distribution calculations:', holdingsWithAmounts);

      setUserHoldings(holdingsWithAmounts);

    } catch (err) {
      console.error('Error calculating distribution:', err);
      if (err instanceof Error) {
        setError(`Failed to calculate distribution: ${err.message}`);
      } else {
        setError('Failed to calculate distribution');
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleDistribute = async () => {
    if (!userHoldings.length) {
      setError('Please calculate distribution first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Create distribution record
      const { data: distribution, error: distributionError } = await adminSupabase
        .from('loan_distributions')
        .insert({
          asset_id: selectedAsset,
          distribution_period_start: periodStart,
          distribution_period_end: periodEnd,
          total_distribution_amount: parseFloat(distributionAmount),
          honey_price_at_distribution: honeyPrice,
          distributed_by: (await adminSupabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (distributionError) throw distributionError;

      // Create payment records
      const payments = userHoldings.map(holding => ({
        distribution_id: distribution.id,
        user_id: holding.user_id,
        asset_id: selectedAsset,
        user_balance_during_period: holding.average_balance,
        days_held_in_period: holding.days_held,
        usd_amount: holding.calculated_usd_amount,
        honey_amount: holding.calculated_honey_amount
      }));

      const { error: paymentsError } = await adminSupabase
        .from('loan_distribution_payments')
        .insert(payments);

      if (paymentsError) throw paymentsError;

      // Process the distribution
      const { error: processError } = await adminSupabase
        .rpc('distribute_loan_payments', {
          p_distribution_id: distribution.id
        });

      if (processError) throw processError;

      // Clear form and refresh data
      setSelectedAsset('');
      setDistributionAmount('');
      setPeriodStart('');
      setPeriodEnd('');
      setUserHoldings([]);
      await fetchAnalytics(timeFilter);

    } catch (err) {
      console.error('Error processing distribution:', err);
      setError('Failed to process distribution');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-light">Loan Distribution</h1>
        <p className="text-light/60">Distribute loan payments to investors</p>
      </div>

      {/* Analytics Dashboard */}
      <div className="bg-dark-2 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-light">Distribution Analytics</h2>
        
        {/* Time Filter */}
        <div className="flex gap-4 mb-6">
          {timeFilters.map(filter => (
            <button
              key={filter.months}
              onClick={() => {
                setTimeFilter(filter.months);
                fetchAnalytics(filter.months);
              }}
              className={`px-4 py-2 rounded-lg ${
                timeFilter === filter.months
                  ? 'bg-primary text-dark'
                  : 'bg-dark-3 text-light/60 hover:text-light'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-dark-3 rounded-lg p-6">
              <h3 className="text-light/60 mb-2">Total USD Distributed</h3>
              <p className="text-2xl font-semibold text-light">
                {formatCurrency(analytics.total_usd_distributed)}
              </p>
            </div>
            <div className="bg-dark-3 rounded-lg p-6">
              <h3 className="text-light/60 mb-2">Total Honey Distributed</h3>
              <p className="text-2xl font-semibold text-light">
                {analytics.total_honey_distributed.toFixed(4)} HONEY
              </p>
            </div>
            <div className="bg-dark-3 rounded-lg p-6">
              <h3 className="text-light/60 mb-2">Total Investors Paid</h3>
              <p className="text-2xl font-semibold text-light">
                {analytics.total_investors_paid}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Distribution Form */}
      <div className="bg-dark-2 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 text-light">New Distribution</h2>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-light/60 mb-2">Select Asset</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            >
              <option value="">Select an asset</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-light/60 mb-2">Distribution Amount (USD)</label>
            <input
              type="number"
              value={distributionAmount}
              onChange={(e) => setDistributionAmount(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              placeholder="Enter amount"
              min="0"
              step="0.01"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          </div>

          <div>
            <label className="block text-light/60 mb-2">Period Start</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          </div>

          <div>
            <label className="block text-light/60 mb-2">Period End</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
              style={{ backgroundColor: '#1a1a1a' }}
            />
          </div>
        </div>

        <button
          onClick={calculateDistribution}
          disabled={calculating}
          className="w-full bg-primary text-dark font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {calculating ? 'Calculating...' : 'Calculate Distribution'}
        </button>
      </div>

      {/* Distribution Preview */}
      {userHoldings.length > 0 && (
        <div className="bg-dark-2 rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-light">Distribution Preview</h2>
            <button
              onClick={handleDistribute}
              disabled={loading}
              className="bg-[#00D54B] text-dark font-medium px-6 py-2 rounded-lg hover:bg-[#00D54B]/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Distribute Payout'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-light/60 border-b border-light/10">
                  <th className="text-left py-4">User</th>
                  <th className="text-right py-4">Average Balance</th>
                  <th className="text-right py-4">Days Held</th>
                  <th className="text-right py-4">USD Amount</th>
                  <th className="text-right py-4">Honey Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light/10">
                {userHoldings.map((holding) => (
                  <tr key={holding.user_id}>
                    <td className="py-4 text-light">{holding.user_email}</td>
                    <td className="py-4 text-right text-light">
                      {holding.average_balance.toFixed(4)}
                    </td>
                    <td className="py-4 text-right text-light">
                      {holding.days_held}
                    </td>
                    <td className="py-4 text-right text-light">
                      {formatCurrency(holding.calculated_usd_amount)}
                    </td>
                    <td className="py-4 text-right text-light">
                      {holding.calculated_honey_amount.toFixed(4)} HONEY
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}; 