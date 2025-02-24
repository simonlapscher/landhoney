import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';

interface BalanceSummary {
  asset_symbol: string;
  asset_name: string;
  asset_type: string;
  total_balance: number;
  total_usd_value: number;
}

export const UserBalancesSummary: React.FC = () => {
  const [balances, setBalances] = useState<BalanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      try {
        const { data, error } = await adminSupabase.rpc('get_total_user_balances');
        
        if (error) throw error;
        
        setBalances(data);
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError('Failed to load balance summary');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-light/10 rounded w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-12 bg-light/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 bg-red-500/10 p-4 rounded">
        {error}
      </div>
    );
  }

  // Calculate totals
  const totals = balances.reduce((acc, balance) => ({
    total_balance: acc.total_balance + balance.total_balance,
    total_usd_value: acc.total_usd_value + balance.total_usd_value
  }), { total_balance: 0, total_usd_value: 0 });

  return (
    <div className="bg-secondary rounded-lg p-6">
      <h2 className="text-xl font-medium text-light mb-6">Platform Balances</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-light/60 border-b border-light/10">
              <th className="pb-3 font-medium">Asset</th>
              <th className="pb-3 font-medium">Type</th>
              <th className="pb-3 font-medium text-right">Total Balance</th>
              <th className="pb-3 font-medium text-right">USD Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-light/10">
            {balances.map((balance) => (
              <tr key={balance.asset_symbol} className="text-light">
                <td className="py-3">
                  <div className="font-medium">{balance.asset_symbol}</div>
                  <div className="text-sm text-light/60">{balance.asset_name}</div>
                </td>
                <td className="py-3 capitalize">{balance.asset_type}</td>
                <td className="py-3 text-right font-mono">
                  {balance.total_balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 8
                  })}
                </td>
                <td className="py-3 text-right font-mono">
                  {formatCurrency(balance.total_usd_value)}
                </td>
              </tr>
            ))}
            
            {/* Totals row */}
            <tr className="text-light font-medium bg-dark-700">
              <td className="py-4 px-2" colSpan={2}>
                Total Platform Value
              </td>
              <td className="py-4 px-2 text-right font-mono">
                -
              </td>
              <td className="py-4 px-2 text-right font-mono">
                {formatCurrency(totals.total_usd_value)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}; 