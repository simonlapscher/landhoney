import React, { useState, useEffect } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '../common/Tooltip';
import { CommodityAsset } from '../../lib/types/asset';
import { Modal } from '../common/Modal';
import { InvestWidget } from './InvestWidget';
import { BitcoinStakingModal } from '../app/BitcoinStakingModal';
import { BitcoinUnstakingModal } from '../app/BitcoinUnstakingModal';
import { useAuth } from '../../lib/context/AuthContext';
import { transactionService } from '../../lib/services/transactionService';

interface BitcoinInvestmentBoxProps {
  asset: CommodityAsset;
  userBalance: number;
  onInvest: () => void;
  onSell: () => void;
}

export const BitcoinInvestmentBox: React.FC<BitcoinInvestmentBoxProps> = ({
  asset,
  userBalance = 0,
  onInvest,
  onSell,
}) => {
  const { user } = useAuth();
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [bitcoinBalance, setBitcoinBalance] = useState(0);
  const [bitcoinXBalance, setBitcoinXBalance] = useState(0);
  const [stakingPercentage, setStakingPercentage] = useState(0);

  useEffect(() => {
    const fetchStakingInfo = async () => {
      if (!user) return;
      try {
        const info = await transactionService.getBitcoinStakingInfo(user.id);
        setBitcoinBalance(info.bitcoinBalance);
        setBitcoinXBalance(info.bitcoinXBalance);
        setStakingPercentage(info.stakingPercentage);
      } catch (err) {
        console.error('Error fetching Bitcoin staking info:', err);
      }
    };

    fetchStakingInfo();
  }, [user]);

  const handleStakingSuccess = () => {
    if (!user) return;
    transactionService.getBitcoinStakingInfo(user.id).then(info => {
      setBitcoinBalance(info.bitcoinBalance);
      setBitcoinXBalance(info.bitcoinXBalance);
      setStakingPercentage(info.stakingPercentage);
    });
  };

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

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center">
            <div className="text-center w-full">
              <p className="text-2xl text-light font-medium">4.2%</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-sm text-light/60">APY</p>
                <Tooltip content="Annual Percentage Yield - The yearly return rate for staking Bitcoin">
                  <InformationCircleIcon className="w-4 h-4 text-light/60 cursor-help" />
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-center w-full">
              <p className="text-2xl text-light font-medium">{stakingPercentage.toFixed(1)}%</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-sm text-light/60">Staked</p>
                <Tooltip content="Percentage of your Bitcoin that is currently staked">
                  <InformationCircleIcon className="w-4 h-4 text-light/60 cursor-help" />
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-center">
              <p className="text-2xl text-light font-medium">7 Days</p>
              <p className="text-sm text-light/60 mt-1">Lock</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowInvestModal(true)}
            className="flex-1 bg-[#F7931A] text-white font-medium py-3 px-6 rounded-lg hover:bg-[#F7931A]/90 transition-colors"
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

        {/* Staking Buttons */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setShowStakeModal(true)}
            className="flex-1 bg-[#00D54B] text-dark font-medium py-3 px-6 rounded-lg hover:bg-[#00D54B]/90 transition-colors"
          >
            Stake
          </button>
          <button
            onClick={() => setShowUnstakeModal(true)}
            disabled={bitcoinXBalance <= 0}
            className="flex-1 bg-[#3A3A3A] text-light/60 font-medium py-3 px-6 rounded-lg hover:bg-[#3A3A3A]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unstake
          </button>
        </div>
      </div>

      {/* Modals */}
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

      <BitcoinStakingModal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        bitcoinBalance={bitcoinBalance}
        bitcoinXBalance={bitcoinXBalance}
        stakingPercentage={stakingPercentage}
        pricePerToken={asset.price_per_token}
        userId={user?.id || ''}
        onSuccess={handleStakingSuccess}
      />

      <BitcoinUnstakingModal
        isOpen={showUnstakeModal}
        onClose={() => setShowUnstakeModal(false)}
        bitcoinBalance={bitcoinBalance}
        bitcoinXBalance={bitcoinXBalance}
        stakingPercentage={stakingPercentage}
        pricePerToken={asset.price_per_token}
        userId={user?.id || ''}
        onSuccess={handleStakingSuccess}
      />
    </>
  );
}; 