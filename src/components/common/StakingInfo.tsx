import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface StakingInfoProps {
  assetName: string;
}

export const StakingInfo: React.FC<StakingInfoProps> = ({ assetName }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-gray-300 transition-colors"
      >
        <span>What is staking?</span>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5" />
        ) : (
          <ChevronDownIcon className="w-5 h-5" />
        )}
      </button>
      
      {isExpanded && (
        <div className="mt-2 p-3 bg-[#2A2A2A] rounded-lg text-gray-400 text-sm">
          By staking your {assetName}, your funds join a liquidity pool where a portion is used to buy assets at a discount from sellers needing to liquidate their assets. These assets are later sold back at market value, and the profits from the discount—along with transaction fees—are distributed as investor rewards.
          <br /><br />
          Your stake can be partially exposed to other assets' price fluctuations, based on the liquidity pool's make up.
        </div>
      )}
    </div>
  );
}; 