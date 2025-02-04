import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/format';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: string;
  loan_amount: number;  // loan amount
  apr: number;     // loan APR
  asset_id: string;  // reference to the assets table ID
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
  total_dollar_days: number;
  share_of_distribution: number;
}

interface User {
  id: string;
  email: string;
}

interface DebtAssetResponse {
  id: string;
  loan_amount: number;
  apr: number;
  asset_id: string;
  assets: {
    name: string;
    symbol: string;
    type: string;
  };
}

export const LoanDistribution: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [periodStart, setPeriodStart] = useState<string>('');
  const [periodEnd, setPeriodEnd] = useState<string>('');
  const [userHoldings, setUserHoldings] = useState<UserHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeyPrice, setHoneyPrice] = useState<number>(0);
  const [analytics, setAnalytics] = useState<DistributionAnalytics | null>(null);
  const [distributionDetails, setDistributionDetails] = useState<{
    interestForPeriod: number;
    userOwnedFraction: number;
    interestToDistribute: number;
  } | null>(null);
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
        
        // Fetch debt assets with loan terms
        const { data, error: assetsError } = await adminSupabase
          .from('debt_assets')
          .select(`
            id,
            loan_amount,
            apr,
            asset_id,
            assets!debt_assets_asset_id_fkey (
              name,
              symbol,
              type
            )
          `)
          .eq('assets.type', 'debt')
          .returns<DebtAssetResponse[]>();

        if (assetsError) throw assetsError;

        // Transform the data to match our Asset interface
        const transformedAssets: Asset[] = data.map(asset => ({
          id: asset.id,
          name: asset.assets.name,
          symbol: asset.assets.symbol,
          type: asset.assets.type,
          loan_amount: asset.loan_amount,
          apr: asset.apr,
          asset_id: asset.asset_id
        }));

        setAssets(transformedAssets);

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
    if (!selectedAsset || !periodStart || !periodEnd) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setCalculating(true);
      setError(null);

      const selectedLoan = assets.find(a => a.id === selectedAsset);
      if (!selectedLoan) {
        throw new Error('Selected loan not found');
      }

      const startDate = new Date(periodStart + 'T00:00:00Z');
      const endDate = new Date(periodEnd + 'T23:59:59Z');
      const daysInPeriod = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      // Calculate interest for period using day-count approach
      const interestForPeriod = selectedLoan.loan_amount * (selectedLoan.apr / 100) * (daysInPeriod / 365);

      console.log('Calculation params:', {
        asset_id: selectedLoan.asset_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        loan_amount: selectedLoan.loan_amount,
        apr: selectedLoan.apr,
        days_in_period: daysInPeriod,
        interest_for_period: interestForPeriod
      });

      // Calculate user holdings for the period
      const { data: holdings, error: holdingsError } = await adminSupabase
        .rpc('calculate_user_holdings', {
          p_asset_id: selectedLoan.asset_id,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString()
        });

      console.log('Raw holdings response:', holdings);
      console.log('Holdings error:', holdingsError);

      if (holdingsError) {
        console.error('Holdings calculation error:', holdingsError);
        throw holdingsError;
      }

      if (!holdings) {
        console.error('No holdings data returned');
        setError('No holdings data returned from calculation');
        return;
      }

      // Check if holdings array exists and has items
      if (!Array.isArray(holdings) || holdings.length === 0) {
        console.error('Holdings is not an array or is empty:', holdings);
        setError('No holdings found for the selected period');
        return;
      }

      console.log('Valid holdings found:', holdings);

      // Calculate user owned fraction and interest to distribute
      const totalDollarDays = holdings.reduce((sum: number, h: Holding) => sum + Number(h.total_dollar_days), 0);
      const userOwnedFraction = totalDollarDays / (selectedLoan.loan_amount * daysInPeriod);
      const interestToDistribute = interestForPeriod * userOwnedFraction;

      setDistributionDetails({
        interestForPeriod,
        userOwnedFraction,
        interestToDistribute
      });

      // Get user emails
      const userIds = holdings.map((h: Holding) => h.user_id);
      console.log('Fetching emails for users:', userIds);

      const { data: users, error: usersError } = await adminSupabase
        .rpc('get_user_emails', {
          p_user_ids: userIds
        });

      if (usersError) {
        console.error('Error fetching user emails:', usersError);
        throw usersError;
      }

      console.log('Users fetched:', users);

      const holdingsWithAmounts = holdings.map((holding: Holding) => {
        const user = users?.find((u: User) => u.id === holding.user_id);
        const usdAmount = Number((interestToDistribute * holding.share_of_distribution).toFixed(2));
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

      const selectedLoan = assets.find(a => a.id === selectedAsset);
      if (!selectedLoan) {
        throw new Error('Selected loan not found');
      }

      // Create distribution record
      const { data: distribution, error: distributionError } = await adminSupabase
        .from('loan_distributions')
        .insert({
          asset_id: selectedLoan.asset_id,
          distribution_period_start: periodStart,
          distribution_period_end: periodEnd,
          total_distribution_amount: distributionDetails?.interestToDistribute,
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
        asset_id: selectedLoan.asset_id,
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
      setPeriodStart('');
      setPeriodEnd('');
      setUserHoldings([]);
      setDistributionDetails(null);
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

        <div className="space-y-6">
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
                  {asset.name} ({asset.symbol}) - {asset.apr}% APR
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-light/60 mb-2">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0 [color-scheme:dark]"
                style={{ backgroundColor: '#1a1a1a' }}
              />
            </div>

            <div>
              <label className="block text-light/60 mb-2">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0 [color-scheme:dark]"
                style={{ backgroundColor: '#1a1a1a' }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={calculateDistribution}
          disabled={calculating}
          className="w-full bg-primary text-dark font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 mt-6"
        >
          {calculating ? 'Calculating...' : 'Calculate Distribution'}
        </button>
      </div>

      {/* Distribution Preview */}
      {userHoldings.length > 0 && distributionDetails && (
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

          {/* Distribution Summary */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-dark-3 rounded-lg p-4">
              <h3 className="text-light/60 mb-2">Interest for Period</h3>
              <p className="text-xl font-semibold text-light">
                {formatCurrency(distributionDetails.interestForPeriod)}
              </p>
            </div>
            <div className="bg-dark-3 rounded-lg p-4">
              <h3 className="text-light/60 mb-2">User Owned Fraction</h3>
              <p className="text-xl font-semibold text-light">
                {(distributionDetails.userOwnedFraction * 100).toFixed(2)}%
              </p>
            </div>
            <div className="bg-dark-3 rounded-lg p-4">
              <h3 className="text-light/60 mb-2">Interest to Distribute</h3>
              <p className="text-xl font-semibold text-light">
                {formatCurrency(distributionDetails.interestToDistribute)}
              </p>
            </div>
          </div>

          {/* User Holdings Table */}
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
                      {formatCurrency(holding.average_balance)}
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