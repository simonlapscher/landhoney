import React from 'react';
import { Asset } from '../../lib/types/asset';
import { AssetCard } from './AssetCard';

interface AssetListingProps {
  assets: Asset[];
}

export const AssetListing: React.FC<AssetListingProps> = ({ assets }) => {
  // Filter out staking tokens
  const filteredAssets = assets.filter(asset => 
    !['BTCX', 'HONEYX'].includes(asset.symbol)
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAssets.map(asset => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}; 