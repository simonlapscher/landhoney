import React from 'react';
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

export const PoolStats: React.FC<PoolStatsProps> = ({
  pool,
  balances,
  userShare,
  onStake,
  onUnstake
}) => {
  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-light/10 p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-light">
          {pool.type === 'bitcoin' ? 'Bitcoin' : 'Honey'} Pool
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-light/60">APR</span>
          <div className="flex items-center gap-1">
            <span className="text-[#00D897] font-medium">{pool.apr}%</span>
            <Tooltip content="Annual Percentage Rate for providing liquidity">
              <InformationCircleIcon className="w-4 h-4 text-light/60" />
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-sm text-light/60 mb-1">Total Value Locked</div>
          <div className="text-xl font-medium text-light">
            {formatCurrency(pool.totalValueLocked)}
          </div>
        </div>
        {userShare !== undefined && (
          <div>
            <div className="text-sm text-light/60 mb-1">Your Share</div>
            <div className="text-xl font-medium text-light">
              {(userShare * 100).toFixed(2)}%
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div className="text-sm text-light/60">Pool Composition</div>
        {balances.map(balance => (
          <div key={balance.id} className="flex justify-between items-center">
            <span className="text-light">{balance.asset?.symbol || 'Unknown'}</span>
            <span className="text-light">{formatCurrency(balance.balance)}</span>
          </div>
        ))}
      </div>

      {(onStake || onUnstake) && (
        <div className="flex gap-4">
          {onStake && (
            <button
              onClick={onStake}
              className="flex-1 bg-[#00D54B] text-dark font-bold py-3 rounded-xl hover:bg-[#00D54B]/90 transition-colors"
            >
              Add Liquidity
            </button>
          )}
          {onUnstake && userShare && userShare > 0 && (
            <button
              onClick={onUnstake}
              className="flex-1 bg-light/10 text-light font-bold py-3 rounded-xl hover:bg-light/20 transition-colors"
            >
              Remove Liquidity
            </button>
          )}
        </div>
      )}
    </div>
  );
}; 