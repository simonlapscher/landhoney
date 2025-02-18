import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Asset } from '../../lib/types/asset';
import { Modal } from '../shared/Modal';
import { formatCurrency } from '../../lib/utils/formatters';
import { InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../lib/context/AuthContext';
import { transactionService } from '../../lib/services/transactionService';
import { FiEdit2 } from 'react-icons/fi';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  onSuccess: () => void;
}

interface TooltipProps {
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content }) => (
  <div className="group relative inline-block">
    <InformationCircleIcon className="w-4 h-4 text-light/60" />
    <div className="hidden group-hover:block absolute z-50 w-64 p-2 text-sm bg-dark-2 text-light/80 rounded-lg shadow-lg -right-1 top-6">
      {content}
    </div>
  </div>
);

export const DepositModal: React.FC<DepositModalProps> = ({ isOpen, onClose, asset, onSuccess }) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [transferMethod, setTransferMethod] = useState<'bank' | 'usdc'>('bank');
  const [step, setStep] = useState<'initial' | 'confirm' | 'success' | 'instructions'>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handlePreviewDeposit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setStep('confirm');
  };

  const handleDeposit = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await transactionService.depositCash(user.id, parseFloat(amount));
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate deposit');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('0x1234...5678');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const renderInitialStep = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">Deposit Cash</h2>
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
            step="0.01"
          />
        </div>
      </div>

      <div className="px-4">
        <div className="flex justify-between items-center mb-8">
          <span className="text-base">Transfer from</span>
          <select
            value={transferMethod}
            onChange={(e) => setTransferMethod(e.target.value as 'bank' | 'usdc')}
            className="bg-[#1E1E1E] text-base text-white px-4 py-2 rounded-lg"
          >
            <option value="bank">Bank Account</option>
            <option value="usdc">USDC</option>
          </select>
        </div>
      </div>

      <button
        onClick={handlePreviewDeposit}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full py-3 px-4 rounded-lg text-black font-medium disabled:opacity-50 bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
      >
        Preview deposit
      </button>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">Confirm Deposit</h2>
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
        <div className="w-16 h-16 mb-4">
          <img src={asset.main_image} alt="USD" className="w-full h-full rounded-full" />
        </div>
        <h3 className="text-2xl font-medium mb-1">
          Deposit {formatCurrency(parseFloat(amount))} USD
        </h3>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            Transfer from
          </div>
          <div>{transferMethod === 'bank' ? 'Bank Account' : 'USDC'}</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            Available to buy
            <Tooltip content="Time until your deposit is available for investing" />
          </div>
          <div>1-3 days</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            Available to withdraw
            <Tooltip content="Time until your deposit is available for withdrawal" />
          </div>
          <div>1-3 days</div>
        </div>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            Platform fee
          </div>
          <div className="text-[#00D897]">Free</div>
        </div>
        <div className="flex justify-between items-center font-medium">
          <div>Total</div>
          <div>{formatCurrency(parseFloat(amount))}</div>
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
          onClick={handleDeposit}
          disabled={loading}
          className="flex-1 py-3 px-4 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
        >
          {loading ? 'Processing...' : 'Deposit Cash'}
        </button>
      </div>
    </div>
  );

  const renderPaymentInstructions = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-4">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">Complete Deposit</h2>
        <div className="flex-1 flex justify-end">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-3xl leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <p className="text-white/60 mb-8">
        Send your payment to complete your deposit.<br />
        Once verified, it will be available in your account.
      </p>

      {transferMethod === 'bank' ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium">Bank Transfer Details</h3>
            <div className="space-y-3 text-light/80">
              <div className="flex justify-between">
                <span>Bank Name</span>
                <span className="font-medium">Mercury</span>
              </div>
              <div className="flex justify-between">
                <span>Account Name</span>
                <span className="font-medium">Landhoney Inc</span>
              </div>
              <div className="flex justify-between">
                <span>Account Type</span>
                <span className="font-medium">Checking</span>
              </div>
              <div className="flex justify-between">
                <span>Routing Number</span>
                <span className="font-medium">123456789</span>
              </div>
              <div className="flex justify-between">
                <span>Account Number</span>
                <span className="font-medium">987654321</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#2A2A2A] rounded-lg">
            <p className="text-light/80">
              Please include your email address in the memo/reference field of your transfer.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-light/5 p-6 rounded-xl space-y-4">
            <div>
              <div className="text-sm text-light/60 mb-1">USDC Address (Ethereum)</div>
              <div className="flex items-center gap-2">
                <span className="text-light font-mono">0x1234...5678</span>
                <button
                  onClick={handleCopy}
                  className="text-primary hover:text-primary/80"
                >
                  {copySuccess ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm text-light/60 mb-1">Amount to Send</div>
              <div className="text-light">{parseFloat(amount).toFixed(2)} USDC</div>
            </div>
          </div>

          <div className="text-sm text-light/60 space-y-2">
            <div className="flex items-center gap-2">
              <Tooltip content="Only send USDC using the Ethereum network" />
              <p>This address will only receive USDC on the Ethereum network.</p>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content="Funds sent on other networks cannot be recovered" />
              <p>Tokens sent to the wrong network will result in lost funds.</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => {
          onSuccess();
          onClose();
          setStep('initial');
          setAmount('');
          setTransferMethod('bank');
          setError(null);
        }}
        className="w-full py-3 px-4 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90] mt-6"
      >
        Done
      </button>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="bg-[#1E1E1E] rounded-lg p-6 max-w-md w-full text-white border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
          <span className="flex items-center justify-center gap-2">
            <CheckCircleIcon className="w-6 h-6 text-[#00D897]" />
            Deposit Initiated
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
        <div className="w-16 h-16 mb-4">
          <img src={asset.main_image} alt="USD" className="w-full h-full rounded-full" />
        </div>
        <h3 className="text-2xl font-medium mb-8">
          Deposit {formatCurrency(parseFloat(amount))} USD
        </h3>

        <div className="p-4 bg-[#2A2A2A] rounded-lg w-full">
          <p className="text-light/90 text-center">
            Your USD deposit will be available once Landhoney confirms receipt of your deposit.
          </p>
        </div>
      </div>

      <button
        onClick={() => setStep('instructions')}
        className="w-full py-3 px-4 rounded-lg text-black font-medium bg-gradient-to-r from-[#4bae4f] to-[#90ee90]"
      >
        View Payment Instructions
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
      {step === 'instructions' && renderPaymentInstructions()}
    </div>
  );
}; 