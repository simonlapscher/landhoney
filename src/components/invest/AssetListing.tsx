import React from 'react';
import { Asset } from '../../lib/types/asset';
import { AssetCard } from './AssetCard';

interface AssetListingProps {
  assets: Asset[];
}

export const AssetListing: React.FC<AssetListingProps> = ({ assets }) => {
  // Debug log all assets and their types
  console.log('All assets:', assets.map(a => ({
    symbol: a.symbol,
    type: a.type,
    raw: a
  })));
  
  // Filter out staking tokens and cash assets
  const filteredAssets = assets.filter(asset => {
    const isStakingToken = ['BTCX', 'HONEYX'].includes(asset.symbol);
    const isInvestableType = ['commodity', 'debt'].includes(asset.type);
    const shouldShow = !isStakingToken && isInvestableType;
    
    // Detailed debug log for each asset
    console.log('Asset filtering:', {
      symbol: asset.symbol,
      type: asset.type,
      isStakingToken,
      isInvestableType,
      shouldShow,
      rawAsset: asset
    });
    
    return shouldShow;
  });

  // Log final filtered assets
  console.log('Filtered assets:', filteredAssets.map(a => ({
    symbol: a.symbol,
    type: a.type
  })));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredAssets.map(asset => (
        <AssetCard key={asset.id} asset={asset} />
      ))}
    </div>
  );
}; 