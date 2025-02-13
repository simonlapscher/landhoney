import React, { useState } from 'react';
import { ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/solid';
import { PencilIcon } from '@heroicons/react/24/outline';
import { Asset } from '../../lib/types/asset';
import { Tooltip } from '../common/Tooltip';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { Transaction } from '../../lib/types/transaction';
import { CheckIcon } from '@heroicons/react/24/outline';

interface SellWidgetProps {
  asset: Asset;
  onClose: () => void;
  userBalance?: number;
}

type WidgetState = 'input' | 'review' | 'confirmation' | 'payment_instructions';

export const SellWidget: React.FC<SellWidgetProps> = ({ asset, onClose, userBalance = 0 }) => {
  // Input state
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'USD' | 'USDC'>('USD');
  const [widgetState, setWidgetState] = useState<WidgetState>('input');
  const { originalUser, isLoading } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [validationError, setValidationError] = useState<string | null>(null);

  // Update the state to include payment preference
  const [selectedPaymentAsset, setSelectedPaymentAsset] = useState<'USD' | 'HONEY' | 'BTC'>('USD');
  const [inputValue, setInputValue] = useState<string>('');

  // Calculate fees and totals
  const numericAmount = parseFloat(amount) || 0;
  const tokenAmount = numericAmount / asset.price_per_token;  // Always convert USD to token amount
  const usdAmount = numericAmount * asset.price_per_token;
  const platformFee = usdAmount * 0.005; // 0.5% of USD amount
  const totalAmount = usdAmount - platformFee;

  // Validation checks
  const validateAmount = () => {
    if (numericAmount <= 0) {
      setValidationError('Amount must be greater than 0');
      return false;
    }

    if (tokenAmount > userBalance) {  // Compare BTC amounts
      setValidationError('Amount exceeds your balance');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAmount()) return;

    if (widgetState === 'input') {
      setWidgetState('review');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await transactionService.createSellTransaction({
        userId: '',  // This will be ignored since we get it from session
        assetId: asset.id,
        amount: tokenAmount,
        pricePerToken: asset.price_per_token
      });

      setTransaction(result);
      setShowSuccess(true);
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

  const formatAmount = (amount: number, type: 'token' | 'usd') => {
    return type === 'token' ? amount.toFixed(4) : amount.toFixed(2);
  };

  if (showSuccess && widgetState === 'confirmation') {
    return (
      <div className="max-w-lg mx-auto bg-dark/95 p-6 rounded-2xl shadow-xl border border-light/10">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#00D897] flex items-center justify-center">
              <CheckIcon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-medium">Success - Your sell order was initiated!</h3>
          </div>

          <div className="bg-light/5 rounded-lg p-4 mb-6">
            <p className="text-light/60">
              Landhoney will reach out with an offer based on available liquidity. Once you accept, the sale will finalize.
            </p>
          </div>

          <div className="bg-[#1A1A1A] rounded-lg p-4 mb-6">
            <h4 className="text-left mb-4">Order Summary - Sell {tokenAmount.toFixed(8)} {asset.symbol}</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-light/60">Order Confirmation Number</span>
                <span className="text-light">#{transaction?.id.slice(-8).toUpperCase()}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-light/60">Net sale</span>
                <span className="text-light">${formatAmount(usdAmount, 'usd')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-light/60">Fee (0.5%)</span>
                <span className="text-light">${formatAmount(platformFee, 'usd')}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-light/60">You'll Receive</span>
                <span className="text-light">{selectedPaymentAsset}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#00D54B] text-dark font-bold py-3 rounded-xl"
          >
            Done
          </button>
        </div>
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

      {widgetState === 'confirmation' ? (
        // Success message
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#00D897] flex items-center justify-center mx-auto mb-4">
            <CheckIcon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-medium mb-2">Order Initiated</h3>
          <p className="text-light/60">
            Your order has been initiated. Landhoney will contact you with an offer based on available platform liquidity. Once you accept, your order will go through.
          </p>
        </div>
      ) : (
        // Input and Review states
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
                    <p className="text-light text-sm ml-2">{formatAmount(userBalance, 'token')} {asset.symbol}</p>
                  </div>
                </div>
                
                {/* Amount Type Toggle */}
                <div className="relative flex items-baseline">
                  <span className="text-5xl font-medium text-white mr-2">$</span>
                  <input
                    type="number"
                    value={inputValue}
                    onChange={(e) => {
                      if (widgetState !== 'review') {
                        const value = e.target.value;
                        setInputValue(value);
                        if (value === '') {
                          setAmount('');
                        } else {
                          const usdAmount = Number(value);
                          if (!isNaN(usdAmount)) {
                            setAmount(usdAmount.toString());  // Store USD amount directly
                          }
                        }
                      }
                    }}
                    readOnly={widgetState === 'review'}
                    className="w-full bg-transparent text-5xl font-medium focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="text-gray-400 mt-2">
                  {tokenAmount.toFixed(8)} {asset.symbol}
                </div>

                {/* Price per token */}
                <div className="mt-4 text-sm text-light/60">
                  Price per token: ${formatAmount(asset.price_per_token, 'usd')}
                </div>
              </div>

              {/* You'll Receive Section - Updated to match styling */}
              <div className="bg-light/5 p-4 rounded-xl">
                <h3 className="text-lg font-bold text-light mb-4">You'll Receive</h3>
                <div className="relative">
                  <select
                    value={selectedPaymentAsset}
                    onChange={(e) => {
                      if (widgetState !== 'review') {
                        setSelectedPaymentAsset(e.target.value as 'USD' | 'HONEY' | 'BTC')
                      }
                    }}
                    disabled={widgetState === 'review'}
                    className="w-full appearance-none bg-light/10 text-light pl-4 pr-12 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="USD">USD</option>
                    <option value="HONEY">HONEY</option>
                    <option value="BTC">BTC</option>
                  </select>
                  <ChevronDownIcon className="w-5 h-5 text-light absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
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
                    className="flex-1 bg-[#00D54B] text-dark font-bold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Processing...' : widgetState === 'review' ? 'Confirm' : 'Review'}
                  </button>
                </div>

                {/* Add balance error message */}
                {tokenAmount > userBalance && (
                  <div className="border border-red-500/20 bg-red-500/10 text-red-500 p-4 rounded-xl text-sm">
                    This amount exceeds your balance. Reduce the selling amount.
                  </div>
                )}

                {/* Fee display */}
                <div className="text-sm text-light/60">
                  <div className="flex items-center gap-2">
                    <span>Fee (0.5%)</span>
                    <Tooltip content="Platform fee charged on each transaction">
                      <InformationCircleIcon className="w-4 h-4 text-light/60 cursor-help" />
                    </Tooltip>
                    <span>=</span>
                    <span>${formatAmount(platformFee, 'usd')}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}; 
