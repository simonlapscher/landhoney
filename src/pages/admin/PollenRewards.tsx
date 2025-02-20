import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { formatNumber } from '../../lib/utils/formatters';

interface ActivityMetrics {
  user_id: string;
  bee_name: string;
  avatar_url: string;
  debt_returns_usd: number;
  avg_honey_held: number;
  avg_honeyx_held: number;
  avg_btcx_held: number;
  staking_returns_usd: number;
  completed_referrals: number;
  total_pollen_awarded?: number;
}

export const PollenRewards: React.FC = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [activityData, setActivityData] = useState<ActivityMetrics[]>([]);

  const calculateRewards = async () => {
    try {
      setCalculating(true);
      const { data, error } = await supabase.rpc('calculate_user_activity_metrics', {
        p_start_date: dateRange.start,
        p_end_date: dateRange.end
      });

      if (error) throw error;

      // Add pollen calculations based on metrics
      const dataWithPollen = data.map((user: ActivityMetrics) => ({
        ...user,
        total_pollen_awarded: calculatePollenForUser(user)
      }));

      setActivityData(dataWithPollen);
    } catch (err) {
      console.error('Error calculating rewards:', err);
    } finally {
      setCalculating(false);
    }
  };

  const calculatePollenForUser = (metrics: ActivityMetrics) => {
    // This is a placeholder formula - adjust based on your requirements
    const debtReturnsPollen = metrics.debt_returns_usd * 100; // 100 PLLN per $1 of returns
    const stakingReturnsPollen = metrics.staking_returns_usd * 100;
    const holdingsPollen = (
      metrics.avg_honey_held * 0.1 +
      metrics.avg_honeyx_held * 0.2 +
      metrics.avg_btcx_held * 0.1
    );
    const referralPollen = metrics.completed_referrals * 1000; // 1000 PLLN per referral

    return Math.floor(
      debtReturnsPollen +
      stakingReturnsPollen +
      holdingsPollen +
      referralPollen
    );
  };

  const distributeRewards = async () => {
    try {
      setDistributing(true);
      
      for (const user of activityData) {
        if (!user.total_pollen_awarded) continue;

        const { error } = await supabase.rpc('award_pollen', {
          p_user_id: user.user_id,
          p_amount: user.total_pollen_awarded,
          p_distribution_type: 'period_reward',
          p_period_start: dateRange.start,
          p_period_end: dateRange.end,
          p_metadata: {
            metrics: {
              debt_returns_usd: user.debt_returns_usd,
              staking_returns_usd: user.staking_returns_usd,
              avg_honey_held: user.avg_honey_held,
              avg_honeyx_held: user.avg_honeyx_held,
              avg_btcx_held: user.avg_btcx_held,
              completed_referrals: user.completed_referrals
            }
          }
        });

        if (error) throw error;
      }

      // Clear the activity data after successful distribution
      setActivityData([]);
    } catch (err) {
      console.error('Error distributing rewards:', err);
    } finally {
      setDistributing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-light">Pollen Rewards</h1>

      {/* Date Range Selection */}
      <div className="bg-[#1A1A1A] rounded-xl p-6 border border-light/10">
        <h2 className="text-xl font-bold text-light mb-4">Select Period</h2>
        <div className="flex gap-4">
          <div>
            <label className="block text-sm text-light/60 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-dark-2 text-light p-2 rounded-lg border border-light/10"
            />
          </div>
          <div>
            <label className="block text-sm text-light/60 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-dark-2 text-light p-2 rounded-lg border border-light/10"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={calculateRewards}
              disabled={calculating}
              className="px-6 py-2 bg-primary text-dark font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {calculating ? 'Calculating...' : 'Calculate Rewards'}
            </button>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      {activityData.length > 0 && (
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-light/10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-light">Activity Summary</h2>
            <button
              onClick={distributeRewards}
              disabled={distributing}
              className="px-6 py-2 bg-primary text-dark font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {distributing ? 'Distributing...' : 'Distribute Rewards'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-light/60 border-b border-light/10">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Debt Returns</th>
                  <th className="py-3 px-4">Avg. HONEY Held</th>
                  <th className="py-3 px-4">Avg. HONEYX Held</th>
                  <th className="py-3 px-4">Avg. BTCX Held</th>
                  <th className="py-3 px-4">Staking Returns</th>
                  <th className="py-3 px-4">Referrals</th>
                  <th className="py-3 px-4">Total Pollen</th>
                </tr>
              </thead>
              <tbody>
                {activityData.map((user) => (
                  <tr key={user.user_id} className="border-b border-light/10">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <img
                          src={user.avatar_url || '/default-avatar.png'}
                          alt={user.bee_name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        <span className="text-light">{user.bee_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-light">
                      ${formatNumber(user.debt_returns_usd)}
                    </td>
                    <td className="py-3 px-4 text-light">
                      {formatNumber(user.avg_honey_held)}
                    </td>
                    <td className="py-3 px-4 text-light">
                      {formatNumber(user.avg_honeyx_held)}
                    </td>
                    <td className="py-3 px-4 text-light">
                      {formatNumber(user.avg_btcx_held)}
                    </td>
                    <td className="py-3 px-4 text-light">
                      ${formatNumber(user.staking_returns_usd)}
                    </td>
                    <td className="py-3 px-4 text-light">
                      {user.completed_referrals}
                    </td>
                    <td className="py-3 px-4 text-light">
                      {formatNumber(user.total_pollen_awarded || 0)}
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