import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Asset } from '../../lib/types/asset';
import { Modal } from '../shared/Modal';
import { formatCurrency } from '../../lib/utils/formatters';
import { useAuth } from '../../lib/context/AuthContext';
import { transactionService } from '../../lib/services/transactionService';
import { FiEdit2 } from 'react-icons/fi';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  balance: number;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, asset, balance, onSuccess }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [step, setStep] = useState<'initial' | 'confirm' | 'success'>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePreviewWithdraw = () => {
    if (!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance) return;
    setStep('confirm');
  };

  const handleWithdraw = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await transactionService.withdrawCash(user.id, parseFloat(amount));
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate withdrawal');
    } finally {
      setLoading(false);
    }
  };

  const renderInitialStep = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">Withdraw Cash</h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-3xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mb-8 px-4">
        <div className="relative flex items-baseline">
          <span className="text-5xl font-medium text-white mr-2">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent text-5xl font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
            min="0"
            max={balance}
            step="0.01"
          />
        </div>
      </div>

      <div className="px-4 mb-8">
        <div className="text-white">{formatCurrency(balance)}</div>
        <div className="text-light/60">Available to withdraw</div>
      </div>

      <button
        onClick={handlePreviewWithdraw}
        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
        className="w-full py-3 px-4 rounded-lg text-black font-medium disabled:opacity-50 bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
      >
        Preview Withdrawal
      </button>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">Confirm Withdrawal</h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-3xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center mb-6">
        <div className="w-12 h-12 mb-3">
          <img src={asset.main_image} alt="USD" className="w-full h-full rounded-full" />
        </div>
        <h3 className="text-xl font-medium mb-1">
          Withdraw {formatCurrency(parseFloat(amount))} USD
        </h3>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            Withdrawal Processing
          </div>
          <div>1-3 days</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            Platform fee
          </div>
          <div className="text-[#00D897]">Free</div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={() => setStep('initial')}
          className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"
        >
          <FiEdit2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleWithdraw}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
        >
          {loading ? 'Processing...' : 'Confirm Withdrawal'}
        </button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
          <span className="flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-[#00D897]" />
            Withdrawal Initiated
          </span>
        </h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-3xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 mb-3">
          <img src={asset.main_image} alt="USD" className="w-full h-full rounded-full" />
        </div>
        <h3 className="text-xl font-medium">
          Withdraw {formatCurrency(parseFloat(amount))} USD
        </h3>
      </div>

      <button
        onClick={() => {
          onSuccess();
          onClose();
          setStep('initial');
          setAmount('');
          setError(null);
        }}
        className="w-full py-3 px-4 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
      >
        Done
      </button>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {step === 'initial' && renderInitialStep()}
      {step === 'confirm' && renderConfirmStep()}
      {step === 'success' && renderSuccessStep()}
    </div>
  );
}; 