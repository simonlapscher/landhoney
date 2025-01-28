import React, { useEffect, useState } from 'react';
import { useUser } from '../../hooks/useUser';
import { transactionService } from '../../lib/services/transactionService';
import { AssetBalance } from '../../lib/types/asset';

export const UserBalance: React.FC = () => {
  const { user } = useUser();
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const data = await transactionService.getUserBalances(user.id);
        setBalances(data);
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError('Failed to load balances');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [user]);

  if (loading) {
    return <div className="text-center text-light/60">Loading balances...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
        {error}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="text-center text-light/60">
        No assets found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-light">Your Assets</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {balances.map((balance) => (
          <div
            key={balance.id}
            className="bg-light/5 p-4 rounded-lg space-y-2"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-light font-medium">
                  {balance.asset.symbol}
                </span>
                <div className="text-sm text-light/60">
                  {balance.asset.name}
                </div>
              </div>
              <div className="text-right">
                <div className="text-light">{balance.balance.toFixed(2)} tokens</div>
                <div className="text-sm text-light/60">
                  ${(balance.balance * balance.asset.price_per_token).toFixed(2)}
                </div>
                {balance.total_interest_earned > 0 && (
                  <div className="text-sm text-[#00D54B]">
                    +${balance.total_interest_earned.toFixed(2)} earned
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 