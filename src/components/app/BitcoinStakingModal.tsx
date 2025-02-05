import React, { useState } from 'react';
import { transactionService } from '../../lib/services/transactionService';
import { formatCurrency } from '../../utils/format';
import { Button } from '../common/Button';
import { IoMdInformationCircleOutline } from 'react-icons/io';
import { FiEdit2 } from 'react-icons/fi';
import { CheckIcon } from '@heroicons/react/24/outline';

interface BitcoinStakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bitcoinBalance: number;
  bitcoinXBalance: number;
  stakingPercentage: number;
  pricePerToken: number;
  userId: string;
  onSuccess: () => void;
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

export const BitcoinStakingModal: React.FC<BitcoinStakingModalProps> = ({
  isOpen,
  onClose,
  bitcoinBalance,
  bitcoinXBalance,
  stakingPercentage,
  pricePerToken,
  userId,
  onSuccess
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
    const maxUsdValue = bitcoinBalance * pricePerToken;
    setInputValue(maxUsdValue.toFixed(2));
    setAmount(bitcoinBalance.toString());
  };

  const handleStakeNowClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError(null);
    setLoading(true);

    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (numAmount > bitcoinBalance) {
        throw new Error('Amount exceeds your Bitcoin balance');
      }

      await transactionService.stakeBitcoin(userId, numAmount);
      
      setShowConfirmation(false);
      setShowSuccess(true);
    } catch (err) {
      console.error('Staking error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while staking');
      setShowSuccess(false);
    } finally {
      setLoading(false);
    }
  };

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

  const handleDone = () => {
    if (showSuccess) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1A1A1A] rounded-lg w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-[#2A2A2A]">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium text-light">Stake Bitcoin</h2>
            <button onClick={onClose} className="text-light/60 hover:text-light">
              ✕
            </button>
          </div>
        </div>

        {showSuccess ? (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 bg-[#00D54B]/20 rounded-full flex items-center justify-center mb-4">
                <CheckIcon className="w-6 h-6 text-[#00D54B]" />
              </div>
              <h3 className="text-xl font-medium text-light mb-2">Success!</h3>
              <p className="text-light/60 text-center mb-8">
                Your Bitcoin has been staked successfully.
              </p>
              <Button onClick={handleDone} className="w-full">
                Done
              </Button>
            </div>
          </div>
        ) : showConfirmation ? (
          <>
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-sm text-light/60">Amount to stake</p>
                  <p className="text-2xl text-light font-medium mt-1">
                    {Number(amount).toFixed(8)} BTC
                  </p>
                  <p className="text-sm text-light/60 mt-1">
                    ≈ {formatCurrency(usdValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-light/60">APY</p>
                  <p className="text-2xl text-light font-medium mt-1">9.5%</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#2A2A2A] rounded-lg mb-8">
                <div>Lock duration</div>
                <div>7 days</div>
              </div>

              <div className="bg-[#1A1A1A] rounded-lg p-4 mb-8 border border-[#2A2A2A]">
                <p className="text-light/80">
                  Your Bitcoin will continue to earn rewards during the unstaking wait time.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
                >
                  <FiEdit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleStakeNowClick}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-lg text-white font-medium bg-[#F7931A] hover:bg-[#F7931A]/90 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Stake now'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="p-6">
              <div className="relative flex items-baseline">
                <span className="text-5xl font-medium text-white mr-2">$</span>
                <input
                  type="number"
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-full bg-transparent text-5xl font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                  min="0"
                  max={bitcoinBalance * pricePerToken}
                  step="0.01"
                />
                <button
                  onClick={handleMaxClick}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-sm text-[#F7931A] hover:text-[#F7931A]/80 bg-[#3A3A3A] px-3 py-1 rounded"
                >
                  Max
                </button>
              </div>
              <div className="text-gray-400 mt-2">
                {Number(amount || 0).toFixed(8)} BTC
              </div>
            </div>

            <div className="flex justify-between items-start mb-8 px-6">
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
                          stroke="#F7931A"
                          strokeWidth="3"
                          strokeDasharray={`${(stakingPercentage + (Number(amount || 0) / (bitcoinBalance + bitcoinXBalance) * 100)) / 100 * (2 * Math.PI * 21)} ${2 * Math.PI * 21}`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="absolute inset-0 p-1.5">
                      <img
                        src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets//bitcoin-btc-logo.png"
                        alt="Bitcoin"
                        className="w-full h-full rounded-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="ml-3">
                  <div className="font-medium">Bitcoin</div>
                  <div className="text-sm text-[#00D897]">9.5% APY</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(bitcoinBalance * pricePerToken)}</div>
                <div className="text-sm text-gray-400">Available</div>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-6 text-sm text-red-500">
                {error}
              </div>
            )}

            <div className="p-6 pt-0">
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!amount || Number(amount) <= 0 || Number(amount) > bitcoinBalance}
                className="w-full py-3 px-4 rounded-lg text-white font-medium bg-[#F7931A] hover:bg-[#F7931A]/90 disabled:opacity-50 disabled:cursor-not-allowed"
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