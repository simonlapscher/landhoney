import React, { useState, useEffect } from 'react';
import { CommodityAsset } from '../../lib/types/asset';
import { Modal } from '../common/Modal';
import { InvestWidget } from './InvestWidget';
import { useAuth } from '../../lib/context/AuthContext';
import { transactionService } from '../../lib/services/transactionService';

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
  const { user } = useAuth();
  const [stakingInfo, setStakingInfo] = useState<{ balance: number, xBalance: number } | null>(null);

  useEffect(() => {
    const fetchStakingInfo = async () => {
      if (!user?.id || !['BTC', 'HONEY'].includes(asset.symbol)) return;

      try {
        if (asset.symbol === 'BTC') {
          const info = await transactionService.getBitcoinStakingInfo(user.id);
          setStakingInfo({
            balance: info.bitcoinBalance,
            xBalance: info.bitcoinXBalance
          });
        } else if (asset.symbol === 'HONEY') {
          const info = await transactionService.getHoneyStakingInfo(user.id);
          setStakingInfo({
            balance: info.honeyBalance,
            xBalance: info.honeyXBalance
          });
        }
      } catch (err) {
        console.error('Error fetching staking info:', err);
      }
    };

    fetchStakingInfo();
  }, [user?.id, asset.symbol]);

  // Calculate total balance including staked tokens
  const totalBalance = stakingInfo 
    ? stakingInfo.balance + stakingInfo.xBalance 
    : userBalance;

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
            ${(totalBalance * asset.price_per_token).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
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
          <button
            onClick={onSell}
            className="w-full bg-[#3A3A3A] text-light/60 font-medium py-3 px-6 rounded-lg hover:bg-[#3A3A3A]/90 transition-colors"
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
          userBalance={totalBalance}
        />
      </Modal>
    </>
  );
}; 