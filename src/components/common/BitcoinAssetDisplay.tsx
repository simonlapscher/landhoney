import React from 'react';
import { ExtendedAsset } from '../../lib/types/portfolio';

interface BitcoinAssetDisplayProps {
  asset: ExtendedAsset;
  stakingPercentage: number;
}

export const BitcoinAssetDisplay: React.FC<BitcoinAssetDisplayProps> = ({ asset, stakingPercentage }) => {
  return (
    <div className="relative">
      <img
        src={asset.main_image}
        alt={asset.name}
        className="w-10 h-10 rounded-full relative"
        style={{ zIndex: 10 }}
      />
      {stakingPercentage > 0 && (
        <svg 
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 48 48"
          style={{ zIndex: 20 }}
        >
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            stroke="#2A2A2A"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="none"
            stroke="#F7931A"
            strokeWidth="4"
            strokeDasharray={`${(stakingPercentage / 100) * (2 * Math.PI * 21)} ${2 * Math.PI * 21}`}
            strokeLinecap="round"
          />
        </svg>
      )}
    </div>
  );
}; 