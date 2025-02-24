import React, { useState } from 'react';
import { transactionService } from '../../lib/services/transactionService';
import { formatCurrency } from '../../utils/format';
import { Button } from '../common/Button';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { FiEdit2 } from 'react-icons/fi';
import { CheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';
import { ExtendedAsset } from '../../lib/types/asset';
import { StakingInfo } from '../common/StakingInfo';

interface HoneyStakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  honeyBalance: number;
  honeyXBalance: number;
  stakingPercentage: number;
  pricePerToken: number;
  userId: string;
  onSuccess: () => void;
  honeyAsset: ExtendedAsset;
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

export const HoneyStakingModal: React.FC<HoneyStakingModalProps> = ({
  isOpen,
  onClose,
  honeyBalance,
  honeyXBalance,
  stakingPercentage,
  pricePerToken,
  userId,
  onSuccess,
  honeyAsset
}) => {
  const [amount, setAmount] = useState<string>('');
  const [inputValue, setInputValue] = useState<string>('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usdValue = Number(amount || 0) * pricePerToken;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Only update the amount if the value is valid
    if (value === '') {
      setAmount('');
    } else {
      const usdAmount = Number(value);
      if (!isNaN(usdAmount)) {
        setAmount((usdAmount / pricePerToken).toString());
      }
    }
  };

  const handleMaxClick = () => {
    const maxUsdValue = honeyBalance * pricePerToken;
    setInputValue(maxUsdValue.toFixed(2));
    setAmount(honeyBalance.toString());
  };

  const handleStakeNowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Stake now button clicked');
    
    setError(null);
    setLoading(true);
    console.log('Starting submit process...', { amount, showConfirmation, showSuccess });

    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (numAmount > honeyBalance) {
        throw new Error('Amount exceeds your Honey balance');
      }

      console.log('Starting staking transaction...', { numAmount, userId });
      await transactionService.stakeHoney(userId, numAmount);
      
      setShowConfirmation(false);
      setShowSuccess(true);
    } catch (err) {
      console.error('Staking error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while staking');
      setShowSuccess(false);
    } finally {
      setLoading(false);
      console.log('Final state:', { showSuccess, showConfirmation, error, loading });
    }
  };

  // Reset input only when modal is explicitly closed
  React.useEffect(() => {
    if (!isOpen) {
      // Only reset if we're not in success state
      if (!showSuccess) {
        setInputValue('');
        setAmount('');
        setShowConfirmation(false);
        setShowSuccess(false);
        setError(null);
        setLoading(false);
      }
    }
  }, [isOpen, showSuccess]);

  // Add logging to track state changes
  React.useEffect(() => {
    console.log('State changed:', { showSuccess, showConfirmation, error, loading, amount, isOpen });
  }, [showSuccess, showConfirmation, error, loading, amount, isOpen]);

  const handleDone = () => {
    console.log('Done button clicked');
    if (showSuccess) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          if (showSuccess) {
            handleDone();
          } else {
            onClose();
          }
        }
      }}
    >
      <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <div className="flex-1" />
          <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
            {showConfirmation ? 'Confirm Stake' : showSuccess ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#00D897] flex items-center justify-center">
                  <CheckIcon className="w-5 h-5 text-white" />
                </div>
                Confirmed Stake
              </div>
            ) : 'Stake Honey'}
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

        {showSuccess ? (
          <>
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
                      strokeDasharray={`${((stakingPercentage + (Number(amount || 0) / (honeyBalance + honeyXBalance) * 100)) / 100) * (2 * Math.PI * 29)} ${2 * Math.PI * 29}`}
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
                Staked {formatCurrency(usdValue)} of Honey
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
        ) : showConfirmation ? (
          <>
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
                      strokeDasharray={`${((stakingPercentage + (Number(amount || 0) / (honeyBalance + honeyXBalance) * 100)) / 100) * (2 * Math.PI * 29)} ${2 * Math.PI * 29}`}
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
                Stake {formatCurrency(usdValue)} of Honey
              </h3>
              <p className="text-gray-400">
                {Number(amount).toFixed(2)} HONEY
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  Earning rate
                  <Tooltip content="The annual percentage yield you'll earn on your staked Honey" />
                </div>
                <div className="text-[#00D897]">—</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  Earning wait time
                  <Tooltip content="Time before your staked Honey starts earning rewards" />
                </div>
                <div>7 days</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  Payout frequency
                  <Tooltip content="How often you'll receive staking rewards" />
                </div>
                <div>Monthly</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  Unstaking wait time
                  <Tooltip content="Time required to unstake your Honey" />
                </div>
                <div>7 days</div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Staking involves risks. By confirming your staking, you agree to our{' '}
              <a href="/staking-terms" target="_blank" rel="noopener noreferrer" className="text-[#FFD700] hover:text-[#E6C200]">
                Staking Terms & Conditions
              </a>
            </p>

            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  console.log('Edit button clicked');
                  setShowConfirmation(false);
                }}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
              >
                <FiEdit2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleStakeNowClick}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-lg text-black font-medium disabled:opacity-50"
                style={{
                  background: `url(https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Honey%20gradient.png)`,
                  backgroundSize: 'cover'
                }}
              >
                {loading ? 'Processing...' : 'Stake now'}
              </button>
            </div>
          </>
        ) : (
          <>
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
                  max={honeyBalance * pricePerToken}
                  step="0.01"
                />
                <button
                  onClick={handleMaxClick}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-[#FFD700] hover:text-[#E6C200] bg-[#3A3A3A] px-3 py-1 rounded"
                >
                  Max
                </button>
              </div>
              <div className="text-gray-400 mt-2">
                {Number(amount || 0).toFixed(2)} HONEY
              </div>
            </div>

            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center">
                <div className="flex items-center">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0">
                      <svg 
                        className="w-full h-full -rotate-90"
                        viewBox="0 0 48 48"
                      >
                        <circle
                          cx="24"
                          cy="24"
                          r="21"
                          fill="none"
                          stroke="#2A2A2A"
                          strokeWidth="3"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="21"
                          fill="none"
                          stroke="#FFD700"
                          strokeWidth="3"
                          strokeDasharray={`${(stakingPercentage + (Number(amount || 0) / (honeyBalance + honeyXBalance) * 100)) / 100 * (2 * Math.PI * 21)} ${2 * Math.PI * 21}`}
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
                </div>
                <div className="ml-3">
                  <div className="font-medium">Honey</div>
                  <div className="text-sm text-[#00D897]">
                    —
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(honeyBalance * pricePerToken)}</div>
                <div className="text-sm text-gray-400">Available</div>
              </div>
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="px-6">
              <StakingInfo assetName="Honey" />
              
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!amount || Number(amount) <= 0 || Number(amount) > honeyBalance}
                className="w-full py-3 px-4 rounded-lg text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `url(https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Honey%20gradient.png)`,
                  backgroundSize: 'cover'
                }}
              >
                Preview stake
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 