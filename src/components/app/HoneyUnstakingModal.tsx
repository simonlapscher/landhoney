import React, { useState } from 'react';
import { transactionService } from '../../lib/services/transactionService';
import { formatCurrency } from '../../utils/format';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { FiEdit2 } from 'react-icons/fi';
import { CheckIcon } from '@heroicons/react/24/outline';
import { Modal } from '../shared/Modal';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Constants for asset IDs
const honeyAssetId = 3;  // Replace with actual Honey asset ID from your database
const honeyxAssetId = 4; // Replace with actual HONEYX asset ID from your database

interface HoneyUnstakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  honeyBalance: number;
  honeyXBalance: number;
  stakingPercentage: number;
  pricePerToken: number;
  userId: string;
  onSuccess: () => void;
  userShares: number;
  totalShares: number;
  poolValue: number;
}

interface TooltipProps {
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content }) => (
  <div className="group relative inline-block">
    <IoMdInformationCircleOutline className="text-gray-400 hover:text-gray-300 ml-1" />
    <div className="hidden group-hover:block absolute z-50 w-48 p-2 bg-gray-800 text-xs text-gray-200 rounded shadow-lg -right-1 top-6">
      {content}
    </div>
  </div>
);

export const HoneyUnstakingModal: React.FC<HoneyUnstakingModalProps> = ({
  isOpen,
  onClose,
  honeyBalance,
  honeyXBalance,
  stakingPercentage,
  pricePerToken,
  userId,
  onSuccess,
  userShares,
  totalShares,
  poolValue
}) => {
  const [amount, setAmount] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate share-based values
  const shareValue = totalShares > 0 ? poolValue / totalShares : 0;
  const maxUnstakeAmount = (userShares * shareValue) / pricePerToken;
  const sharesToBurn = Number(amount || 0) * pricePerToken / shareValue;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value === '') {
      setAmount('');
    } else {
      const usdAmount = Number(value);
      if (!isNaN(usdAmount)) {
        // Ensure amount doesn't exceed max unstakeable amount
        const honeyAmount = Math.min(usdAmount / pricePerToken, maxUnstakeAmount);
        setAmount(honeyAmount.toString());
      }
    }
  };

  const handleMaxClick = () => {
    const maxUsdValue = maxUnstakeAmount * pricePerToken;
    setInputValue(maxUsdValue.toFixed(2));
    setAmount(maxUnstakeAmount.toString());
  };

  const handleUnstakeNowClick = async () => {
    if (!amount) return;
    
    setLoading(true);
    try {
      const { data: transaction, error } = await supabase.rpc('unstake_honey', {
        p_user_id: userId,
        p_amount: sharesToBurn,
        p_honey_asset_id: honeyAssetId,
        p_honeyx_asset_id: honeyxAssetId,
        p_price_per_token: pricePerToken
      });

      if (error) throw error;

      setShowConfirmation(true);
      onSuccess();
    } catch (error) {
      console.error('Error unstaking Honey:', error);
      toast.error('Failed to unstake Honey. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset input when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setInputValue('');
      setAmount('');
      setShowConfirmation(false);
      setShowSuccess(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Add logging to track state changes
  React.useEffect(() => {
    console.log('State changed:', { showSuccess, showConfirmation, error, loading, amount });
  }, [showSuccess, showConfirmation, error, loading, amount]);

  const handleDone = () => {
    console.log('Done button clicked');
    if (showSuccess) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      {showConfirmation ? (
        <>
          <div className="flex justify-between items-center mb-8">
            <div className="flex-1" />
            <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#00D897] flex items-center justify-center">
                  <CheckIcon className="w-5 h-5 text-white" />
                </div>
                Confirmed Unstake
              </div>
            </h2>
            <div className="flex-1 flex justify-end">
              {!showSuccess && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-300 text-3xl leading-none"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center mb-6">
            <div className="relative w-16 h-16 mb-4">
              <div className="absolute inset-0">
                <svg 
                  className="w-full h-full -rotate-90"
                  viewBox="0 0 64 64"
                >
                  <circle
                    cx="32"
                    cy="32"
                    r="29"
                    fill="none"
                    stroke="#2A2A2A"
                    strokeWidth="3"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="29"
                    fill="none"
                    stroke="#FFD700"
                    strokeWidth="3"
                    strokeDasharray={`${((honeyXBalance - Number(amount || 0)) / (honeyBalance + honeyXBalance) * 100 / 100) * (2 * Math.PI * 29)} ${2 * Math.PI * 29}`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="absolute inset-0 p-1.5">
                <img
                  src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Honey%20gradient.png"
                  alt="Honey"
                  className="w-full h-full rounded-full"
                />
              </div>
            </div>
            <h3 className="text-2xl font-medium mb-1">
              Unstaked {formatCurrency(maxUnstakeAmount * pricePerToken)} of Honey
            </h3>
            <p className="text-gray-400">
              {Number(amount).toFixed(2)} HONEY
            </p>
          </div>

          <button
            onClick={handleDone}
            className="w-full py-3 px-4 rounded-lg text-black font-medium"
            style={{
              background: `url(https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Honey%20gradient.png)`,
              backgroundSize: 'cover'
            }}
          >
            Done
          </button>
        </>
      ) : (
        <div className="p-6">
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-center">
              <div className="ml-3">
                <div className="font-medium">Honey</div>
                <div className="text-sm text-[#00D897]">8.8% APY</div>
                <div className="text-sm text-gray-400">
                  Your shares: {userShares.toFixed(2)} HONEYPS
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-medium">{formatCurrency(maxUnstakeAmount * pricePerToken)}</div>
              <div className="text-sm text-gray-400">Available to unstake</div>
              <div className="text-xs text-gray-500">
                {maxUnstakeAmount.toFixed(2)} HONEY
              </div>
            </div>
          </div>

          <div className="mb-8 px-4">
            <div className="relative flex items-baseline">
              <span className="text-5xl font-medium text-white mr-2">$</span>
              <input
                type="number"
                value={inputValue}
                onChange={handleInputChange}
                className="w-full bg-transparent text-5xl font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
                min="0"
                max={maxUnstakeAmount * pricePerToken}
                step="0.01"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-[#F7931A] hover:text-[#F7931A]/80 bg-[#3A3A3A] px-3 py-1 rounded"
              >
                Max
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowConfirmation(true)}
            disabled={!amount || Number(amount) <= 0 || Number(amount) > maxUnstakeAmount}
            className="w-full py-3 px-4 rounded-lg text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
            }}
          >
            Preview unstake
          </button>
        </div>
      )}
    </Modal>
  );
}; 