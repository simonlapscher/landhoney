import React, { useEffect } from 'react';
import { formatCurrency } from '../../lib/utils/formatters';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '../common/Tooltip';
import { DatabasePool } from '../../lib/types/portfolio';

interface PoolPositionProps {
  pool: DatabasePool;
  userStakedAmount: number;  // This is in BTCX/HONEYX tokens
  poolOwnership: number;     // This is the ownership percentage (e.g. 0.4162 for 41.62%)
  currentValue: number;      // This is in USD, calculated as ownership * total pool value
  pricePerToken: number;     // This is BTC/HONEY price in USD
}

export const PoolPosition: React.FC<PoolPositionProps> = ({
  pool,
  userStakedAmount,
  poolOwnership,
  currentValue,
  pricePerToken,
}) => {
  useEffect(() => {
    console.log('PoolPosition - Received props:', {
      poolId: pool.id,
      poolType: pool.type,
      userStakedAmount,
      poolOwnership,
      currentValue,
      pricePerToken,
      mainAssetSymbol: pool.main_asset.symbol,
      totalValueLocked: pool.total_value_locked
    });
  }, [pool, userStakedAmount, poolOwnership, currentValue, pricePerToken]);

  // Initial stake value in USD
  const initialStakeUSD = userStakedAmount * pricePerToken;
  
  // Pool return is the difference between current value and initial stake
  const poolReturn = currentValue - initialStakeUSD;
  const mainAssetSymbol = pool.main_asset.symbol;
  const ownershipPercentage = poolOwnership * 100;
  
  // Calculate token amounts
  const currentTokenAmount = currentValue / pricePerToken;
  const tokenReturn = currentTokenAmount - userStakedAmount;
  
  useEffect(() => {
    console.log('PoolPosition - Calculated values:', {
      initialStakeUSD,
      currentValue,
      poolReturn,
      ownershipPercentage,
      initialStakeInTokens: userStakedAmount,
      currentValueInTokens: currentTokenAmount,
      tokenReturn,
      calculationDetails: {
        userStakedAmount,
        pricePerToken,
        initialStakeCalc: `${userStakedAmount} * ${pricePerToken} = ${initialStakeUSD}`,
        currentValue,
        poolReturnCalc: `${currentValue} - ${initialStakeUSD} = ${poolReturn}`
      }
    });
  }, [initialStakeUSD, currentValue, poolReturn, ownershipPercentage]);
  
  const formatTokenAmount = (amount: number) => {
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
            {formatCurrency(initialStakeUSD)}
          </div>
          <div className="text-sm text-light/60">
            {formatTokenAmount(userStakedAmount)} {mainAssetSymbol}
          </div>
        </div>

        {/* Position Value */}
        <div>
          <div className="text-sm text-light/60 mb-1">Position Value</div>
          <div className="text-xl font-medium text-light">
            {formatCurrency(currentValue)}
          </div>
          <div className="text-sm text-light/60">
            {formatTokenAmount(currentTokenAmount)} {mainAssetSymbol}
          </div>
        </div>

        {/* Pool Return */}
        <div>
          <div className="text-sm text-light/60 mb-1">Pool Return</div>
          <div className={`text-xl font-medium ${poolReturn >= 0 ? 'text-[#00D897]' : 'text-red-500'}`}>
            {poolReturn >= 0 ? '+' : ''}{formatCurrency(poolReturn)}
          </div>
          <div className="text-sm text-light/60">
            {poolReturn >= 0 ? '+' : ''}{formatTokenAmount(tokenReturn)} {mainAssetSymbol}
          </div>
        </div>
      </div>
    </div>
  );
}; 