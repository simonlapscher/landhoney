import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Asset, DebtAsset, CommodityAsset } from '../../lib/types/asset';

interface AssetCardProps {
  asset: Asset;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    console.log('Card clicked, navigating to:', `/app/invest/${asset.id}`);
    navigate(`/app/invest/${asset.id}`);
  };

  const handleInvestClick = (e: React.MouseEvent) => {
    console.log('Invest button clicked, navigating to:', `/app/invest/${asset.id}`);
    e.stopPropagation(); // Prevent card click when clicking the button
    navigate(`/app/invest/${asset.id}`);
  };

  const isDebtAsset = (asset: Asset): asset is DebtAsset => {
    return asset.type === 'debt';
  };

  const isCommodityAsset = (asset: Asset): asset is CommodityAsset => {
    return asset.type === 'commodity';
  };

  const getLatestPrice = (asset: CommodityAsset) => {
    if (!asset.asset_prices?.length) return null;
    return asset.asset_prices.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0].price;
  };

  return (
    <div 
      className="bg-secondary rounded-lg overflow-hidden cursor-pointer hover:bg-secondary/80 transition-colors flex flex-col h-full"
      onClick={handleCardClick}
    >
      <div className="relative pt-[56.25%]">
        <img
          src={asset.main_image}
          alt={asset.name}
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        {isDebtAsset(asset) ? (
          <>
            <h3 className="text-xl text-light mb-4 text-center">{asset.location}</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{asset.apr}%</p>
                <p className="text-sm text-light/60">APR</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{asset.ltv}%</p>
                <p className="text-sm text-light/60">LTV</p>
              </div>
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{asset.term_months} Mo.</p>
                <p className="text-sm text-light/60">Term</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="space-y-2 mb-6">
                <div className="w-full bg-dark rounded-full h-2">
                  <div
                    className="bg-[#42DB98] h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, (asset.funded_amount / asset.loan_amount) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex justify-end text-sm">
                  <span className="text-light/60">
                    ${Math.round(asset.remaining_amount).toLocaleString()} remaining
                  </span>
                </div>
              </div>
              <button 
                onClick={handleInvestClick}
                className="w-full bg-[#00D54B] text-dark font-medium py-3 px-6 rounded-lg hover:bg-[#00D54B]/90 transition-colors mt-auto"
              >
                Invest
              </button>
            </div>
          </>
        ) : isCommodityAsset(asset) ? (
          <div className="flex flex-col justify-between h-full">
            <div className="mb-8">
              <h3 className="text-xl text-light mb-2">{asset.name}</h3>
              <p className="text-light/60">{asset.description}</p>
            </div>
            {getLatestPrice(asset) && (
              <div className="mb-8">
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl text-light font-medium">
                    ${getLatestPrice(asset)?.toLocaleString() || '0'}
                  </p>
                  {asset.symbol === 'HONEY' && (
                    <p className="text-sm text-light/60">per Honey = 1oz gold</p>
                  )}
                </div>
              </div>
            )}
            <button 
              onClick={handleInvestClick}
              className="w-full bg-[#00D54B] text-dark font-medium py-3 px-6 rounded-lg hover:bg-[#00D54B]/90 transition-colors"
            >
              Invest
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}; 