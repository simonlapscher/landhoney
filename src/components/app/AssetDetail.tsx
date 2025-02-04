import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { ImageGallery } from '../common/ImageGallery';
import { InvestmentBox } from '../invest/InvestmentBox';
import { HoneyInvestmentBox } from '../invest/HoneyInvestmentBox';
import { Asset, BaseAsset, DebtAsset, CommodityAsset } from '../../lib/types/asset';
import { assetService } from '../../lib/services/assetService';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface RawDebtAsset extends Omit<DebtAsset, 'images'> {
  images?: Array<string | { url: string }>;
}

interface RawCommodityAsset extends CommodityAsset {}

type RawAsset = (RawDebtAsset | RawCommodityAsset) & {
  debt_assets?: RawDebtAsset[];
};

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [asset, setAsset] = useState<RawAsset | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      
      try {
        const assetData = await assetService.getAssetById(id);
        if (assetData) {
          setAsset(assetData as RawAsset);
          
          // Fetch user balance if user is logged in
          if (user) {
            const balances = await transactionService.getUserBalances(user.id);
            const assetBalance = balances.find(b => b.asset_id === id);
            setUserBalance(assetBalance?.balance || 0);
          }
        }
      } catch (error) {
        console.error('Error fetching asset:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id, user]);

  if (loading || !asset) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  // Extract images from the raw data structure
  let images: string[] = [];
  
  // First, ensure we have the main image
  if (asset.main_image) {
    images.push(asset.main_image);
  }

  // For debt assets, check for additional images
  if (asset.type === 'debt') {
    const debtAsset = asset.debt_assets?.[0];
    if (debtAsset?.images && Array.isArray(debtAsset.images)) {
      const additionalImages = debtAsset.images
        .map((img: string | { url: string }) => typeof img === 'string' ? img : img.url)
        .filter(Boolean);
      if (additionalImages.length > 0) {
        images = [...images, ...additionalImages];
      }
    }
  }

  console.log('Raw asset data:', asset);
  console.log('Asset main_image:', asset.main_image);
  console.log('Debt assets:', asset.debt_assets);
  console.log('Images array for gallery:', images);

  console.log('Current asset state:', {
    type: asset.type,
    symbol: asset.symbol,
    shouldShowHoneyBox: asset.type === 'commodity' && asset.symbol === 'HONEY'
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Image Gallery */}
      <div className="mb-8">
        <ImageGallery images={images} alt={asset.name} />
      </div>

      <div className="flex gap-8">
        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-2xl font-medium text-light">
                {asset.type === 'debt' ? (asset as DebtAsset).location : asset.name}
              </h1>
              <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                Active
              </span>
            </div>
            <div className="text-lg font-secondary text-light/60 mb-4">
              {asset.symbol}
            </div>
            <p className="text-light/60">{asset.description}</p>
          </div>
        </div>

        {/* Investment Box */}
        <div className="w-96">
          {asset.type === 'debt' ? (
            <InvestmentBox
              asset={asset as DebtAsset}
              userBalance={userBalance}
              onInvest={() => {}}
              onSell={() => {}}
            />
          ) : asset.symbol === 'HONEY' ? (
            <HoneyInvestmentBox
              asset={asset}
              userBalance={userBalance}
              onInvest={() => {}}
              onSell={() => {}}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}; 