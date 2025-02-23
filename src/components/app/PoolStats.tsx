import React, { useMemo } from 'react';
import { Pool, PoolBalance } from '../../lib/types/pool';
import { formatCurrency } from '../../lib/utils/formatters';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../common/Tooltip';

interface PoolStatsProps {
  pool: Pool;
  balances: PoolBalance[];
  userShare?: number;
  onStake?: () => void;
  onUnstake?: () => void;
}

type AssetType = 'debt' | 'commodity' | 'cash';

interface ProcessedBalance extends Omit<PoolBalance, 'asset'> {
  asset?: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
    type?: AssetType;
  };
  displayName: string;
  value: number;
}

interface ProcessedBalances {
  aggregatedBalances: ProcessedBalance[];
  totalValue: number;
}

export const PoolStats: React.FC<PoolStatsProps> = ({
  pool,
  balances,
  userShare,
  onStake,
  onUnstake
}) => {
  console.log('PoolStats received balances:', balances);
  console.log('PoolStats received pool:', pool);

  // Process balances to exclude zero balances
  const processedBalances = useMemo(() => {
    const hasValue = (balance: PoolBalance) => 
      balance.balance > 0 && balance.asset?.price_per_token;

    // First, filter out zero balances and cash assets
    const filteredBalances = balances
      .filter(hasValue)
      .filter(balance => balance.asset?.type !== 'cash')  // Filter out cash assets
      .map(balance => ({
        ...balance,
        displayName: balance.asset?.type === 'debt' 
          ? balance.asset.symbol 
          : balance.asset?.symbol === 'BTCX' 
            ? 'Bitcoin' 
            : balance.asset?.name || '',
        value: balance.balance * (balance.asset?.price_per_token || 0)
      }))
      .sort((a, b) => b.value - a.value);  // Sort by value

    const totalValue = filteredBalances.reduce(
      (sum, balance) => sum + balance.value,
      0
    );

    return {
      aggregatedBalances: filteredBalances,
      totalValue
    };
  }, [balances]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-light/60">Pool Composition</div>
      
      {/* Progress bar */}
      <div className="h-4 rounded-full overflow-hidden bg-[#2A2A2A] flex">
        {processedBalances.aggregatedBalances.map((balance, index) => {
          const percentage = (balance.value / processedBalances.totalValue) * 100;
          console.log('Rendering bar for:', {
            symbol: balance.asset?.symbol,
            value: balance.value,
            percentage
          });
          return (
            <div
              key={balance.id}
              style={{
                width: `${percentage}%`,
                background: balance.asset?.symbol === 'BTCX' 
                  ? 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'  // Bitcoin orange gradient
                  : balance.asset?.type === 'debt'
                    ? 'linear-gradient(90deg, #4bae4f 0%, #90ee90 100%)'  // Debt green gradient
                    : '#FFD700'  // Gold color for other assets
              }}
              className="h-full"
            />
          );
        })}
      </div>

      {/* Asset breakdown */}
      <div className="space-y-2">
        {processedBalances.aggregatedBalances.map(balance => (
          <div key={balance.id} className="flex justify-between items-center">
            <span className="text-light">{balance.displayName}</span>
            <span className="text-light">
              {formatCurrency(balance.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}; 