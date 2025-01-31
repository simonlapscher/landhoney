import React, { useState } from 'react';
import { transactionService } from '../../lib/services/transactionService';
import { formatCurrency } from '../../utils/format';
import { Button } from '../common/Button';

interface HoneyStakingModalProps {
  isOpen: boolean;
  onClose: () => void;
  honeyBalance: number;
  honeyXBalance: number;
  stakingPercentage: number;
  pricePerToken: number;
  userId: string;
  onSuccess: () => void;
}

export const HoneyStakingModal: React.FC<HoneyStakingModalProps> = ({
  isOpen,
  onClose,
  honeyBalance,
  honeyXBalance,
  stakingPercentage,
  pricePerToken,
  userId,
  onSuccess
}) => {
  const [amount, setAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxAmount = isStaking ? honeyBalance : honeyXBalance;
  const usdValue = Number(amount || 0) * pricePerToken;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      if (numAmount > maxAmount) {
        throw new Error(`Amount exceeds your ${isStaking ? 'Honey' : 'staked Honey'} balance`);
      }

      if (isStaking) {
        await transactionService.stakeHoney(userId, numAmount);
      } else {
        await transactionService.unstakeHoney(userId, numAmount);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Staking error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {isStaking ? 'Stake' : 'Unstake'} Honey
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Available Balance</span>
            <span>{maxAmount.toFixed(4)} HONEY</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-4">
            <span>Currently Staked</span>
            <span>{stakingPercentage.toFixed(1)}%</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to {isStaking ? 'Stake' : 'Unstake'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#FFD700] focus:border-[#FFD700]"
                placeholder="0.0000"
                step="0.0001"
                min="0"
                max={maxAmount}
              />
              <button
                type="button"
                onClick={() => setAmount(maxAmount.toString())}
                className="absolute right-2 top-2 text-sm text-[#FFD700] hover:text-[#E6C200]"
              >
                MAX
              </button>
            </div>
            <div className="text-sm text-gray-500 mt-1">
              ≈ {formatCurrency(usdValue)}
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex space-x-4">
            <Button
              type="button"
              variant={isStaking ? 'primary' : 'secondary'}
              onClick={() => setIsStaking(true)}
              className="flex-1"
            >
              Stake
            </Button>
            <Button
              type="button"
              variant={!isStaking ? 'primary' : 'secondary'}
              onClick={() => setIsStaking(false)}
              className="flex-1"
            >
              Unstake
            </Button>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full mt-4"
          >
            {loading
              ? 'Processing...'
              : `${isStaking ? 'Stake' : 'Unstake'} Honey`}
          </Button>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          <p className="mb-2">
            {isStaking
              ? 'Staking Honey earns you 8.8% APY, paid monthly.'
              : 'Unstaking Honey removes it from the staking pool.'}
          </p>
          <p>
            {isStaking
              ? 'There is a 7-day waiting period before rewards start accruing.'
              : 'You can stake again at any time.'}
          </p>
        </div>
      </div>
    </div>
  );
}; 