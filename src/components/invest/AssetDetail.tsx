import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { ImageGallery } from '../common/ImageGallery';
import { InvestmentBox } from './InvestmentBox';
import { HoneyInvestmentBox } from './HoneyInvestmentBox';
import { Asset, DebtAsset } from '../../lib/types/asset';
import { assetService } from '../../lib/services/assetService';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await assetService.getAssetById(id);
        console.log('Fetched asset data:', data);
        setAsset(data);
      } catch (err) {
        console.error('Error fetching asset:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id]);

  useEffect(() => {
    const fetchUserBalance = async () => {
      if (!user || !asset) return;
      try {
        console.log('Fetching balances for user:', user.id);
        const balances = await transactionService.getUserBalances(user.id);
        console.log('User balances:', balances);
        const assetBalance = balances.find(b => b.asset_id === asset.id);
        console.log('Found balance for this asset:', assetBalance);
        setUserBalance(assetBalance?.balance || 0);
      } catch (err) {
        console.error('Error fetching user balance:', err);
      }
    };

    fetchUserBalance();
  }, [user, asset]);

  if (loading || !asset) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner />
      </div>
    );
  }

  // Use the images array from the asset if available
  const images = asset.type === 'debt' && (asset as DebtAsset).images 
    ? (asset as DebtAsset).images || [asset.main_image]
    : [asset.main_image];

  console.log('Current asset state:', {
    type: asset?.type,
    symbol: asset?.symbol,
    shouldShowHoneyBox: asset?.type === 'commodity' && asset?.symbol === 'HONEY'
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

          {/* Tabs */}
          <Tab.Group>
            <Tab.List className="flex space-x-8 border-b border-light/10">
              {['Description', 'Investment Terms', 'Documents'].map((tab) => (
                <Tab
                  key={tab}
                  className={({ selected }) =>
                    classNames(
                      'pb-4 text-base font-medium border-b-2 -mb-px',
                      selected
                        ? 'border-primary text-primary'
                        : 'border-transparent text-light/60 hover:text-light/80 hover:border-light/30'
                    )
                  }
                >
                  {tab}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-8">
              <Tab.Panel>
                <div className="prose prose-invert max-w-none">
                  <p>{asset.description}</p>
                  {asset.type === 'debt' && (
                    <>
                      <h3>Property Details</h3>
                      <ul>
                        <li>Location: {(asset as DebtAsset).location}</li>
                        <li>Property Type: Commercial</li>
                        <li>Square Footage: 7800 sqft</li>
                      </ul>
                    </>
                  )}
                </div>
              </Tab.Panel>
              <Tab.Panel>
                {asset.type === 'debt' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-light mb-2">Loan Terms</h3>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-light/60">APR</dt>
                          <dd className="text-light text-lg">{(asset as DebtAsset).apr}%</dd>
                        </div>
                        <div>
                          <dt className="text-light/60">LTV</dt>
                          <dd className="text-light text-lg">{(asset as DebtAsset).ltv}%</dd>
                        </div>
                        <div>
                          <dt className="text-light/60">Term</dt>
                          <dd className="text-light text-lg">{(asset as DebtAsset).term}</dd>
                        </div>
                        <div>
                          <dt className="text-light/60">Total Loan Amount</dt>
                          <dd className="text-light text-lg">
                            ${(asset as DebtAsset).loan_amount.toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-light mb-2">Investment Details</h3>
                      <dl className="grid grid-cols-2 gap-4">
                        <div>
                          <dt className="text-light/60">Minimum Investment</dt>
                          <dd className="text-light text-lg">
                            ${asset.min_investment.toLocaleString()}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-light/60">Maximum Investment</dt>
                          <dd className="text-light text-lg">
                            ${asset.max_investment.toLocaleString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                )}
              </Tab.Panel>
              <Tab.Panel>
                <div className="text-light/60">No documents available yet.</div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
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
          ) : asset.type === 'commodity' && asset.symbol === 'HONEY' ? (
            <HoneyInvestmentBox
              asset={asset}
              userBalance={userBalance}
              onInvest={() => {}}
              onSell={() => {}}
            />
          ) : (
            <div className="text-light/60">
              Debug: Asset type={asset.type}, symbol={asset.symbol}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 