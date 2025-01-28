import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { ImageGallery } from '../common/ImageGallery';
import { InvestmentBox } from './InvestmentBox';
import { Asset, DebtAsset } from '../../lib/types/asset';
import { assetService } from '../../lib/services/assetService';
import { LoadingSpinner } from '../common/LoadingSpinner';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAsset = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await assetService.getAssetById(id);
        setAsset(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching asset:', err);
        setError('Failed to load asset details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-light/60">{error || 'Asset not found'}</p>
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

  // Use the images array from the asset if available
  const images = asset.type === 'debt' && (asset as DebtAsset).images 
    ? (asset as DebtAsset).images || [asset.main_image]
    : [asset.main_image];

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
          {asset.type === 'debt' && (
            <InvestmentBox
              asset={asset as DebtAsset}
              userBalance={0}
              onInvest={() => {}}
              onSell={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
}; 