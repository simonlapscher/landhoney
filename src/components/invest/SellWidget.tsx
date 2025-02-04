import React, { useState } from 'react';
import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Asset } from '../../lib/types/asset';
import { Tooltip } from '../common/Tooltip';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { Transaction } from '../../lib/types/transaction';

interface SellWidgetProps {
  asset: Asset;
  onClose: () => void;
  userBalance?: number;
}

type WidgetState = 'input' | 'review' | 'confirmation' | 'payment_instructions';

export const SellWidget: React.FC<SellWidgetProps> = ({ asset, onClose, userBalance = 0 }) => {
  // Input state
  const [amount, setAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'USD' | 'Token'>('Token');
  const [paymentMethod, setPaymentMethod] = useState<'USD' | 'USDC'>('USD');
  const [widgetState, setWidgetState] = useState<WidgetState>('input');
  const { originalUser, isLoading } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate fees and totals
  const numericAmount = parseFloat(amount) || 0;
  const tokenAmount = amountType === 'Token' ? numericAmount : numericAmount / asset.price_per_token;
  const usdAmount = amountType === 'Token' ? numericAmount * asset.price_per_token : numericAmount;
  const platformFee = usdAmount * 0.005; // 0.5% of USD amount
  const totalAmount = usdAmount - platformFee;

  // Validation checks
  const validateAmount = () => {
    if (!originalUser) {
      setValidationError('Please sign in to sell');
      return false;
    }

    if (numericAmount <= 0) {
      setValidationError('Amount must be greater than 0');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAmount() || !originalUser) return;

    if (widgetState === 'input') {
      setWidgetState('review');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await transactionService.createTransaction(
        asset.id,
        usdAmount,
        tokenAmount,
        platformFee,
        paymentMethod,
        asset.price_per_token,
        'sell'
      );

      setTransaction(response);
      setWidgetState('confirmation');
    } catch (err) {
      console.error('Error creating sell transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setWidgetState('input');
  };

  if (widgetState === 'confirmation') {
    return (
      <div className="max-w-lg mx-auto bg-dark/95 p-6 rounded-2xl shadow-xl border border-light/10">
        <h2 className="text-xl font-bold text-light mb-6">Success - Your sell order has been created!</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
            {error}
          </div>
        )}
        
        <div className="mb-6">
          <div className="bg-light/5 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-bold text-light mb-4">
              Order Summary - Sell {tokenAmount.toFixed(2)} {asset.symbol}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-light/60">Order Confirmation Number</span>
                <span className="text-light">#{transaction?.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light/60">Price per token</span>
                <span className="text-light">${asset.price_per_token.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light/60">Net sale</span>
                <span className="text-light">${usdAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light/60">Fee (0.5%)</span>
                <span className="text-light">${platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-light/10 my-2" />
              <div className="flex justify-between font-bold">
                <span className="text-light">Total to Receive</span>
                <span className="text-light">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#00D54B] text-dark font-bold py-3 rounded-xl hover:bg-[#00D54B]/90 transition-colors"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-[#1E1E1E] p-6 rounded-2xl shadow-xl border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
          {widgetState === 'review' ? 'Confirm Sale' : `Sell ${asset.symbol}`}
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
      <div className="space-y-6">
        {/* Show validation error if exists */}
        {validationError && (
          <div className="p-4 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
            {validationError}
          </div>
        )}

        {/* Show loading state if checking user auth */}
        {isLoading ? (
          <div className="text-center text-light/60">Loading...</div>
        ) : (
          <>
            {/* You're Selling Section */}
            <div className="bg-light/5 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-light">You're Selling</h3>
                <div className="flex items-center">
                  <span className="text-light/60 text-sm">Your balance:</span>
                  <p className="text-light text-sm ml-2">{userBalance.toFixed(2)} {asset.symbol}</p>
                </div>
              </div>
              
              {/* Amount Type Label */}
              <p className="text-sm text-light/60 mb-2">Sell amount in:</p>

              {/* Amount Type Toggle */}
              <div className="flex gap-2 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    className="hidden"
                    checked={amountType === 'USD'}
                    onChange={() => setAmountType('USD')}
                    disabled={widgetState === 'review'}
                  />
                  <span className={`px-3 py-1 text-sm rounded-lg ${
                    amountType === 'USD' ? 'bg-primary text-dark' : 'bg-light/10'
                  }`}>
                    USD
                  </span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    className="hidden"
                    checked={amountType === 'Token'}
                    onChange={() => setAmountType('Token')}
                    disabled={widgetState === 'review'}
                  />
                  <span className={`px-3 py-1 text-sm rounded-lg ${
                    amountType === 'Token' ? 'bg-primary text-dark' : 'bg-light/10'
                  }`}>
                    Token Amount
                  </span>
                </label>
              </div>

              {/* Amount Input */}
              <div className="relative">
                {amountType === 'USD' && (
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-light text-4xl">$</span>
                )}
                <input
                  type="text"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (amountType === 'USD') {
                      setAmount(value.replace(/[^0-9.]/g, ''));
                    } else {
                      setAmount(value.replace(/[^0-9.]/g, ''));
                    }
                  }}
                  disabled={widgetState === 'review'}
                  className={`w-full bg-transparent text-light text-4xl font-medium p-6 focus:outline-none ${
                    amountType === 'USD' ? 'pl-12' : ''
                  }`}
                />
              </div>

              {/* Price per token */}
              <div className="mt-2 text-sm text-light/60">
                Price per token: ${asset.price_per_token.toLocaleString()}
              </div>
            </div>

            {/* You'll Receive Section */}
            <div className="bg-light/5 p-4 rounded-xl">
              <h3 className="text-lg font-bold text-light mb-4">You'll Receive</h3>
              {widgetState === 'review' ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-light/60">Selling</span>
                    <span className="text-light">{tokenAmount.toFixed(2)} {asset.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light/60">Price per token</span>
                    <span className="text-light">${asset.price_per_token.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light/60">Net sale</span>
                    <span className="text-light">${usdAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light/60">Fee (0.5%)</span>
                    <span className="text-light">${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-light/10 my-2" />
                  <div className="flex justify-between font-bold">
                    <span className="text-light">Total to Receive</span>
                    <span className="text-light">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-light">{paymentMethod}</span>
                  <span className="text-light">${totalAmount.toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex gap-2">
                {widgetState === 'review' && (
                  <button
                    onClick={handleEdit}
                    className="bg-light/10 hover:bg-light/20 text-light p-3 rounded-xl transition-colors"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={!amount || isSubmitting || !!validationError}
                  className={`${widgetState === 'review' ? 'flex-1' : 'w-full'} bg-[#00D54B] text-dark font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00D54B]/90 transition-colors`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : !amount ? (
                    'Enter Amount'
                  ) : validationError ? (
                    'Invalid Amount'
                  ) : widgetState === 'review' ? (
                    'Confirm'
                  ) : (
                    'Review'
                  )}
                </button>
              </div>

              <div className="text-sm text-light/60">
                <div className="flex items-center gap-2">
                  <span>Fee (0.5%)</span>
                  <Tooltip content="Platform fee charged on each transaction">
                    <InformationCircleIcon className="w-4 h-4 text-light/60 cursor-help" />
                  </Tooltip>
                  <span>=</span>
                  <span>${platformFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 
