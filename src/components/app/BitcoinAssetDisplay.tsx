import React from 'react';
import { ExtendedAsset } from '../../lib/types/asset';

interface BitcoinAssetDisplayProps {
  asset: ExtendedAsset;
  stakingPercentage: number;
}

export const BitcoinAssetDisplay: React.FC<BitcoinAssetDisplayProps> = ({
  asset,
  stakingPercentage
}) => {
  return (
    <div className="relative w-[52px] h-[52px] -ml-[6px]">
      <div className="absolute inset-0">
        <svg 
          className="w-full h-full -rotate-90"
          viewBox="0 0 52 52"
        >
          <circle
            cx="26"
            cy="26"
            r="23"
            fill="none"
            stroke="#2A2A2A"
            strokeWidth="4"
          />
          <circle
            cx="26"
            cy="26"
            r="23"
            fill="none"
            stroke="#F7931A"
            strokeWidth="4"
            strokeDasharray={`${(stakingPercentage || 0) / 100 * (2 * Math.PI * 23)} ${2 * Math.PI * 23}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="absolute inset-0 m-[6px]">
        <img
          src={asset.main_image}
          alt={asset.name}
          className="w-10 h-10 rounded-full"
        />
      </div>
    </div>
  );
}; 