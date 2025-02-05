import React, { useState } from 'react';
import { CommodityAsset } from '../../lib/types/asset';
import { Modal } from '../common/Modal';
import { InvestWidget } from './InvestWidget';

interface CommodityInvestmentBoxProps {
  asset: CommodityAsset;
  userBalance: number;
  onInvest: () => void;
  onSell: () => void;
}

export const CommodityInvestmentBox: React.FC<CommodityInvestmentBoxProps> = ({
  asset,
  userBalance = 0,
  onInvest,
  onSell,
}) => {
  const [showInvestModal, setShowInvestModal] = useState(false);

  const getAssetConfig = () => {
    if (asset.symbol === 'BTC') {
      return {
        color: '#F7931A'
      };
    }
    if (asset.symbol === 'HONEY') {
      return {
        color: '#FFD700'
      };
    }
    return {
      color: '#00D54B'
    };
  };

  const config = getAssetConfig();

  return (
    <>
      <div className="bg-secondary rounded-lg p-6 sticky top-4">
        {/* User Balance */}
        <div className="mb-6 flex items-center gap-2">
          <p className="text-light/60 text-sm">Your balance</p>
          <p className="text-light text-sm">
            ${userBalance.toLocaleString()}
          </p>
        </div>

        {/* Asset Price */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <p className="text-2xl text-light font-medium">
              ${asset.price_per_token.toLocaleString()}
            </p>
            <p className="text-sm text-light/60">per {asset.symbol}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowInvestModal(true)}
            style={{ backgroundColor: config.color }}
            className="flex-1 text-white font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-colors"
          >
            Buy
          </button>
          <button
            onClick={onSell}
            className="flex-1 bg-[#3A3A3A] text-light/60 font-medium py-3 px-6 rounded-lg hover:bg-[#3A3A3A]/90 transition-colors"
          >
            Sell
          </button>
        </div>
      </div>

      {/* Invest Modal */}
      <Modal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
      >
        <InvestWidget
          asset={asset}
          onClose={() => setShowInvestModal(false)}
          userBalance={userBalance}
        />
      </Modal>
    </>
  );
}; 