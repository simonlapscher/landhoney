import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatPercentage } from '../../utils/format';

export interface Asset {
  id: string;
  name: string;
  type: 'debt' | 'commodity';
  imageUrl: string;
  location?: string;
  apr?: number;
  ltv?: number;
  term?: string;
  fundingGoal: number;
  fundedAmount: number;
  remainingAmount: number;
  status: 'active' | 'funded' | 'closed';
  description?: string;
}

interface AssetCardProps {
  asset: Asset;
}

export const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const navigate = useNavigate();
  const percentageFunded = (asset.fundedAmount / asset.fundingGoal) * 100;

  const handleClick = () => {
    navigate(`/invest/${asset.id}`);
  };

  const termInMonths = asset.term?.replace(' months', ' Mo.');

  return (
    <div 
      onClick={handleClick}
      className="bg-secondary border border-light/10 rounded-lg overflow-hidden cursor-pointer hover:border-light/30 transition-colors flex flex-col"
    >
      <div className="relative h-48">
        <img 
          src={asset.imageUrl} 
          alt={asset.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-lg font-semibold text-light mb-4 text-center">
          {asset.type === 'debt' ? asset.location : asset.name}
        </h3>

        {asset.type === 'debt' ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-light">{formatPercentage(asset.apr || 0)}</p>
                <p className="text-sm text-light/60">APR</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-light">{formatPercentage(asset.ltv || 0)}</p>
                <p className="text-sm text-light/60">LTV</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-light">{termInMonths}</p>
                <p className="text-sm text-light/60">Term</p>
              </div>
            </div>

            <div className="mt-auto">
              <div className="w-full bg-light/5 rounded-full h-2 mb-2">
                <div 
                  className="bg-[#42DB98] h-2 rounded-full" 
                  style={{ width: `${percentageFunded}%` }}
                />
              </div>
              <div className="text-right mb-4">
                <span className="text-sm text-light">
                  {formatCurrency(asset.remainingAmount)} remaining
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col">
            {asset.description && (
              <p className="text-base text-light mb-6">{asset.description}</p>
            )}
            <div className="mb-6">
              <p className="text-sm text-light/60 mb-2">Price</p>
              <p className="text-2xl font-bold text-light flex items-baseline">
                {formatCurrency(asset.fundingGoal / 1000)}
                <span className="text-sm text-light/60 ml-1">per {asset.name}</span>
              </p>
            </div>
            <div className="flex-grow" />
          </div>
        )}

        <button 
          className="w-full bg-[#42DB98] text-dark py-3 px-4 rounded-md text-lg font-medium hover:bg-[#3BC589] transition-colors duration-200"
          onClick={(e) => {
            e.stopPropagation();
            // Handle invest action
          }}
        >
          Invest
        </button>
      </div>
    </div>
  );
}; 