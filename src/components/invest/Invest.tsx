import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { AssetCard } from './AssetCard';
import { Asset } from '../../lib/types/asset';
import { assetService } from '../../lib/services/assetService';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const Invest: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const categories = ['All Assets', 'Debt', 'Commodities'];

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const data = await assetService.getAllAssets();
        setAssets(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Failed to load assets. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, []);

  // First, filter out staking tokens, cash assets, and specific debt assets
  const investableAssets = assets.filter(asset => {
    const isStakingToken = ['BTCX', 'HONEYX'].includes(asset.symbol);
    const isInvestable = asset.type === 'debt' || asset.type === 'commodity';
    const isHiddenDebt = ['DEBT1', 'DEBT5'].includes(asset.symbol);
    
    // Add more detailed logging specifically for USD
    if (asset.symbol === 'USD') {
      console.log('USD Asset Check:', {
        symbol: asset.symbol,
        type: asset.type,
        isStakingToken,
        isInvestable,
        rawAsset: asset
      });
    }
    
    const shouldShow = !isStakingToken && isInvestable && !isHiddenDebt;
    console.log(`Asset ${asset.symbol}: shouldShow=${shouldShow}, type=${asset.type}`);
    
    return shouldShow;
  });

  // Add logging for final filtered assets
  console.log('Final investable assets:', investableAssets.map(a => ({
    symbol: a.symbol,
    type: a.type
  })));

  // Then filter by category and sort
  const filteredAssets = (selectedIndex === 0 
    ? investableAssets // Show all investable assets (no cash)
    : investableAssets.filter(asset => 
        asset.type === (selectedIndex === 1 ? 'debt' : 'commodity')
      )
  ).sort((a, b) => {
    // If both are debt assets
    if (a.type === 'debt' && b.type === 'debt') {
      // Put DEBT004 last
      if (a.symbol === 'DEBT004') return 1;
      if (b.symbol === 'DEBT004') return -1;
      // Otherwise sort by symbol
      return a.symbol.localeCompare(b.symbol);
    }
    // Keep existing order for non-debt assets
    return 0;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-light/10 rounded w-32 mb-8" />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-secondary h-96 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-light/60">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-primary hover:text-primary-light"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border-b border-light/10 mb-8">
        <nav className="flex space-x-8">
          {categories.map((category, index) => (
            <button
              key={category}
              className={classNames(
                'pb-4 text-base font-medium border-b-2 -mb-px text-lg',
                selectedIndex === index
                  ? 'border-primary text-primary'
                  : 'border-transparent text-light/60 hover:text-light/80 hover:border-light/30'
              )}
              onClick={() => setSelectedIndex(index)}
            >
              {category}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAssets.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}; 