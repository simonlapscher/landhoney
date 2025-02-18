import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Asset, DebtAsset, CommodityAsset } from '../../lib/types/asset';
import { supabase } from '../../lib/supabaseClient';

interface AssetCardProps {
  asset: Asset;
}

interface FundingStats {
  asset_id: string;
  symbol: string;
  loan_amount: number;
  total_funded_amount: number;
  remaining_amount: number;
  percent_funded: number;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const navigate = useNavigate();
  const [fundingStats, setFundingStats] = useState<FundingStats | null>(null);

  useEffect(() => {
    const fetchFundingStats = async () => {
      if (asset.type === 'debt') {
        const { data, error } = await supabase
          .from('asset_funding_stats')
          .select('*')
          .eq('asset_id', asset.id)
          .single();

        if (!error && data) {
          console.log('Funding stats for', asset.symbol, ':', data);
          setFundingStats(data);
        } else if (error) {
          console.error('Error fetching funding stats:', error);
        }
      }
    };

    fetchFundingStats();
  }, [asset.id, asset.type]);

  const handleCardClick = () => {
    navigate(`/app/invest/${asset.id}`);
  };

  const handleInvestClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/app/invest/${asset.id}`);
  };

  const getAssetConfig = (asset: CommodityAsset) => {
    if (asset.symbol === 'BTC') {
      return {
        color: '#F7931A',
        description: 'Decentralized peer-to-peer money'
      };
    }
    if (asset.symbol === 'HONEY') {
      return {
        color: '#FFD700',
        description: 'Gold-backed token. 1 Honey = 1oz gold'
      };
    }
    return {
      color: '#00D54B',
      description: asset.description || ''
    };
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-secondary rounded-lg overflow-hidden cursor-pointer hover:bg-secondary/80 transition-colors"
    >
      {/* Card Header */}
      <div className="relative h-48 bg-dark">
        <img
          src={asset.main_image}
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Card Content */}
      <div className="p-6">
        {asset.type === 'debt' ? (
          <div className="flex flex-col h-[240px] justify-between">
            <div className="text-center">
              <h3 className="text-xl text-light">{(asset as DebtAsset).location}</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{(asset as DebtAsset).apr}%</p>
                <p className="text-sm text-light/60">APR</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{(asset as DebtAsset).ltv}%</p>
                <p className="text-sm text-light/60">LTV</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-light/60">Duration</p>
                <p className="text-2xl text-light font-medium">{(asset as DebtAsset).duration_months} Mo.</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00D54B] rounded-full"
                  style={{
                    width: `${fundingStats ? fundingStats.percent_funded : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-end text-sm">
                <span className="text-light/60">
                  ${fundingStats ? Math.round(fundingStats.remaining_amount).toLocaleString() : Math.round((asset as DebtAsset).loan_amount).toLocaleString()} remaining
                </span>
              </div>
            </div>

            <button 
              onClick={handleInvestClick}
              className="w-full text-dark font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-colors"
              style={{
                background: 'linear-gradient(90deg, #00D54B 0%, #00F76C 100%)'
              }}
            >
              Invest
            </button>
          </div>
        ) : asset.type === 'commodity' ? (
          <div className="flex flex-col justify-between h-full">
            <div className="mb-8">
              <h3 className="text-xl text-light mb-2">{asset.name}</h3>
              <p className="text-light/60">{getAssetConfig(asset as CommodityAsset).description}</p>
            </div>
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <p className="text-2xl text-light font-medium">
                  ${asset.price_per_token.toLocaleString()}
                </p>
                <p className="text-sm text-light/60">per {asset.symbol}</p>
              </div>
            </div>
            <button 
              onClick={handleInvestClick}
              className="w-full text-dark font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-colors"
              style={{
                background: asset.symbol === 'BTC' 
                  ? 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
                  : asset.symbol === 'HONEY'
                  ? 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)'
                  : 'linear-gradient(90deg, #00D54B 0%, #00F76C 100%)'
              }}
            >
              Buy
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}; 