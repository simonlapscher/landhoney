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
const bitcoinAssetId = 1; // Replace with actual Bitcoin asset ID from your database
const btcxAssetId = 2;   // Replace with actual BTCX asset ID from your database

interface BitcoinUnstakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  bitcoinBalance: number;
  bitcoinXBalance: number;
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

export const BitcoinUnstakingModal: React.FC<BitcoinUnstakingModalProps> = ({
  isOpen,
  onClose,
  bitcoinBalance,
  bitcoinXBalance,
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
        const btcAmount = Math.min(usdAmount / pricePerToken, maxUnstakeAmount);
        setAmount(btcAmount.toString());
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
      const { data: transaction, error } = await supabase.rpc('unstake_bitcoin', {
        p_user_id: userId,
        p_amount: sharesToBurn,
        p_btc_asset_id: bitcoinAssetId,
        p_btcx_asset_id: btcxAssetId,
        p_price_per_token: pricePerToken
      });

      if (error) throw error;

      setShowConfirmation(true);
      onSuccess();
    } catch (error) {
      console.error('Error unstaking Bitcoin:', error);
      toast.error('Failed to unstake Bitcoin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      console.log('Modal closing, resetting states');
      setInputValue('');
      setAmount('');
      setShowConfirmation(false);
      setShowSuccess(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  const handleDone = () => {
    console.log('HandleDone called, showSuccess:', showSuccess);
    if (showSuccess) {
      onSuccess();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div 
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            console.log('Backdrop clicked, showSuccess:', showSuccess);
            if (showSuccess) {
              handleDone();
            } else if (!loading) {
              onClose();
            }
          }
        }}
      >
        <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-8">
            <div className="flex-1" />
            <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
              {showConfirmation ? 'Confirm Unstake' : showSuccess ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#00D897] flex items-center justify-center">
                    <CheckIcon className="w-5 h-5 text-white" />
                  </div>
                  Confirmed Unstake
                </div>
              ) : 'Unstake Bitcoin'}
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
                        stroke="#F7931A"
                        strokeWidth="3"
                        strokeDasharray={`${((bitcoinXBalance - Number(amount)) / (bitcoinBalance + bitcoinXBalance) * 100) / 100 * (2 * Math.PI * 29)} ${2 * Math.PI * 29}`}
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
                <h3 className="text-2xl font-medium mb-1">
                  Unstaked ${Number(sharesToBurn * pricePerToken).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of Bitcoin
                </h3>
                <p className="text-gray-400">
                  {Number(amount).toFixed(8)} BTC
                </p>
              </div>

              <button
                onClick={handleDone}
                className="w-full py-3 px-4 rounded-lg text-black font-medium"
                style={{
                  background: 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
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
                        stroke="#F7931A"
                        strokeWidth="3"
                        strokeDasharray={`${((bitcoinXBalance - Number(amount)) / (bitcoinBalance + bitcoinXBalance) * 100) / 100 * (2 * Math.PI * 29)} ${2 * Math.PI * 29}`}
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
                <h3 className="text-2xl font-medium mb-1">
                  Unstake ${Number(sharesToBurn * pricePerToken).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of Bitcoin
                </h3>
                <p className="text-gray-400">
                  {Number(amount).toFixed(8)} BTC
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    Unstaking wait time
                    <Tooltip content="Time required to unstake your Bitcoin" />
                  </div>
                  <div>7 days</div>
                </div>
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
                  onClick={handleUnstakeNowClick}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-lg text-black font-medium disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
                  }}
                >
                  {loading ? 'Processing...' : 'Unstake now'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center">
                  <div className="ml-3">
                    <div className="font-medium">Bitcoin</div>
                    <div className="text-sm text-[#00D897]">9.5% APY</div>
                    <div className="text-sm text-gray-400">
                      Your shares: {userShares.toFixed(8)} BTCPS
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(maxUnstakeAmount * pricePerToken)}</div>
                  <div className="text-sm text-gray-400">Available to unstake</div>
                  <div className="text-xs text-gray-500">
                    {maxUnstakeAmount.toFixed(8)} BTC
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

              {error && (
                <div className="mb-4 text-sm text-red-500">
                  {error}
                </div>
              )}

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
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

/*
 * UNSTAKING PROCESS EXPLANATION
 * 
 * Previous Issue:
 * The unstaking process was failing due to a mismatch between the staking_positions table's
 * status constraint (which only allowed 'active' or 'unstaked') and the update_staking_positions
 * trigger trying to set positions to 'inactive'.
 * 
 * Root Cause:
 * 1. The staking_positions table had a CHECK constraint allowing only 'active' or 'unstaked'
 * 2. The update_staking_positions trigger was trying to set status to 'inactive'
 * 3. This violated the constraint, causing the transaction to fail
 * 
 * Solution:
 * 1. Updated the trigger function to use 'unstaked' instead of 'inactive'
 * 2. Simplified the unstaking function to let the trigger handle position updates
 * 3. Ensured consistent status values across all related functions
 * 
 * Lessons Learned:
 * 1. Always check table constraints before making status changes
 * 2. Use RAISE NOTICE or debug tables for better error tracking
 * 3. Consider triggers when debugging database operations
 * 4. Keep status values consistent across the entire application
 * 5. Use step-by-step debugging to isolate issues in complex operations
 * 
 * Best Practices:
 * 1. Document allowed status values in table definitions
 * 2. Use enums or check constraints to enforce valid status values
 * 3. Keep trigger logic in sync with table constraints
 * 4. Test complex operations with detailed logging enabled
 */ 