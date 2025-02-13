import React from 'react';
import { formatCurrency } from '../../lib/utils/formatters';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../common/Tooltip';
import { DatabasePool } from '../../lib/types/portfolio';

interface PoolPositionProps {
  pool: DatabasePool;
  userStakedAmount: number;
  poolOwnership: number;
  currentValue: number;
  pricePerToken: number;
}

export const PoolPosition: React.FC<PoolPositionProps> = ({
  pool,
  userStakedAmount,
  poolOwnership,
  currentValue,
  pricePerToken,
}) => {
  const poolReturn = currentValue - (userStakedAmount * pricePerToken);
  const mainAssetSymbol = pool.main_asset.symbol;
  const ownershipPercentage = poolOwnership * 100;
  
  const formatMainAssetAmount = (usdAmount: number) => {
    const amount = usdAmount / pricePerToken;
    return pool.type === 'bitcoin' ? amount.toFixed(8) : amount.toFixed(2);
  };

  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-light/10 p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-light">My Position</h2>
        <div className="flex items-center gap-2">
          <span className="text-light/60">Pool Share</span>
          <div className="flex items-center gap-1">
            <span className="text-[#00D897] font-medium">{ownershipPercentage.toFixed(2)}%</span>
            <Tooltip content="Your percentage ownership of the pool">
              <InformationCircleIcon className="w-4 h-4 text-light/60" />
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Initial Stake */}
        <div>
          <div className="text-sm text-light/60 mb-1">Initial Stake</div>
          <div className="text-xl font-medium text-light">
            {formatCurrency(userStakedAmount * pricePerToken)}
          </div>
          <div className="text-sm text-light/60">
            {formatMainAssetAmount(userStakedAmount * pricePerToken)} {mainAssetSymbol}
          </div>
        </div>

        {/* Position Value */}
        <div>
          <div className="text-sm text-light/60 mb-1">Position Value</div>
          <div className="text-xl font-medium text-light">
            {formatCurrency(currentValue)}
          </div>
          <div className="text-sm text-light/60">
            {formatMainAssetAmount(currentValue)} {mainAssetSymbol}
          </div>
        </div>

        {/* Pool Return */}
        <div>
          <div className="text-sm text-light/60 mb-1">Pool Return</div>
          <div className={`text-xl font-medium ${poolReturn >= 0 ? 'text-[#00D897]' : 'text-red-500'}`}>
            {poolReturn >= 0 ? '+' : ''}{formatCurrency(poolReturn)}
          </div>
          <div className="text-sm text-light/60">
            {poolReturn >= 0 ? '+' : ''}{formatMainAssetAmount(poolReturn)} {mainAssetSymbol}
          </div>
        </div>
      </div>
    </div>
  );
}; 