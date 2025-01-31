import React, { useState } from 'react';
import { Asset } from '../../lib/types/asset';
import { InvestWidget } from './InvestWidget';
import { SellWidget } from './SellWidget';
import { Modal } from '../common/Modal';

interface HoneyInvestmentBoxProps {
  asset: Asset;
  userBalance: number;
  onInvest: () => void;
  onSell: () => void;
}

export const HoneyInvestmentBox: React.FC<HoneyInvestmentBoxProps> = ({
  asset,
  userBalance = 0,
  onInvest,
  onSell,
}) => {
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  return (
    <>
      <div className="bg-secondary rounded-lg p-6 sticky top-4">
        {/* User Balance */}
        <div className="mb-6">
          <div className="flex items-center">
            <p className="text-light/60 text-sm">Your balance</p>
            <p className="text-light text-sm ml-2">{userBalance.toFixed(2)} HONEY</p>
          </div>
        </div>

        {/* Price Info */}
        <div className="mb-6">
          <p className="text-light/60 text-sm mb-1">Price</p>
          <div className="flex items-baseline">
            <p className="text-light text-2xl font-medium">
              ${asset.price_per_token.toLocaleString()}
            </p>
            <p className="text-light/60 text-sm ml-2">per Honey</p>
          </div>
          <p className="text-light/60 text-sm mt-2">1 HONEY = 1oz of gold</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowInvestModal(true)}
            className="flex-1 bg-[#00D54B] text-dark font-medium py-3 px-6 rounded-lg hover:bg-[#00D54B]/90 transition-colors"
          >
            Invest
          </button>
          <button
            onClick={() => setShowSellModal(true)}
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
        />
      </Modal>

      {/* Sell Modal */}
      <Modal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
      >
        <SellWidget
          asset={asset}
          onClose={() => setShowSellModal(false)}
        />
      </Modal>
    </>
  );
}; 