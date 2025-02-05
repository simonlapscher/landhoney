import React, { useState } from 'react';
import { ChevronDownIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { PencilIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Asset } from '../../lib/types/asset';
import { Tooltip } from '../common/Tooltip';
import { useNavigate } from 'react-router-dom';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { Transaction } from '../../lib/types/transaction';

interface InvestWidgetProps {
  asset: Asset;
  onClose: () => void;
  userBalance?: number;
}

type WidgetState = 'input' | 'review' | 'confirmation' | 'payment_instructions';

export const InvestWidget: React.FC<InvestWidgetProps> = ({ asset, onClose, userBalance = 0 }) => {
  // Input state
  const [amount, setAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'USD' | 'Token'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'USD' | 'USDC'>('USD');
  const [widgetState, setWidgetState] = useState<WidgetState>('input');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { originalUser, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Calculate amounts based on input type
  const numericAmount = parseFloat(amount) || 0;
  const usdAmount = amountType === 'USD' ? numericAmount : numericAmount * asset.price_per_token;
  const tokenAmount = amountType === 'USD' ? numericAmount / asset.price_per_token : numericAmount;
  const platformFee = usdAmount * 0.005; // 0.5%
  const totalAmount = usdAmount + platformFee;
  const address = '0x1234567890abcdef1234567890abcdef12345678';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Validation checks
  const validateAmount = () => {
    if (!originalUser) {
      setValidationError('Please sign in to invest');
      return false;
    }

    if (asset.type === 'debt') {
      if (usdAmount < asset.min_investment) {
        setValidationError(`Minimum investment is $${asset.min_investment.toLocaleString()}`);
        return false;
      }

      if (usdAmount > asset.max_investment) {
        setValidationError(`Maximum investment is $${asset.max_investment.toLocaleString()}`);
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateAmount()) return;

    if (widgetState === 'input') {
      setWidgetState('review');
    } else if (widgetState === 'review') {
      try {
        setIsSubmitting(true);
        setValidationError(null);
        
        if (!originalUser) {
          throw new Error('Please sign in to invest');
        }

        const newTransaction = await transactionService.createTransaction(
          asset.id,
          usdAmount,
          tokenAmount,
          platformFee,
          paymentMethod,
          asset.price_per_token
        );
        
        setTransaction(newTransaction);
        setWidgetState('confirmation');
      } catch (err) {
        console.error('Error creating transaction:', err);
        setValidationError(err instanceof Error ? err.message : 'Failed to create transaction. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = () => {
    setWidgetState('input');
  };

  const handleShowPaymentInstructions = () => {
    setWidgetState('payment_instructions');
  };

  const renderPaymentInstructions = () => {
    if (!transaction?.id) return null;
    const orderRef = transaction.id.slice(-8).toUpperCase();

    switch (paymentMethod) {
      case 'USD':
        return (
          <div className="space-y-4 text-light">
            <h3 className="font-medium mb-4">Wire Transfer Instructions</h3>
            <div className="bg-light/5 p-4 rounded-lg space-y-2">
              <p>Bank: Silicon Valley Bank</p>
              <p>Account Name: Landhoney Inc</p>
              <p>Account Number: 1234567890</p>
              <p>Routing Number: 121140399</p>
              <p>SWIFT/BIC: SVBKUS6S</p>
              <div className="flex items-center gap-1">
                <div className="flex items-center">
                  <Tooltip content="Please add this payment reference to your transfer details">
                    <p>Reference: #{orderRef}</p>
                  </Tooltip>
                </div>
              </div>
            </div>
            <div className="bg-light/5 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <InformationCircleIcon className="w-5 h-5 text-light/60 shrink-0" />
                <span>Please include the reference number in your transfer details to avoid delays in processing.</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <InformationCircleIcon className="w-5 h-5 text-light/60 shrink-0" />
                <span>Wire transfers typically take 1-3 business days to process.</span>
              </div>
            </div>
          </div>
        );

      case 'USDC':
        return (
          <div className="space-y-4 text-light">
            <h3 className="font-medium mb-4">Send USDC on Ethereum</h3>
            <div className="bg-light/5 p-4 rounded-lg space-y-4">
              {/* QR Code with USDC logo */}
              <div className="w-48 h-48 mx-auto rounded-lg flex items-center justify-center overflow-hidden bg-white p-4">
                <img 
                  src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/Landhoney%20Tokeny.png"
                  alt="USDC QR Code"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between gap-2 bg-light/10 p-2 rounded-lg relative">
                <div className="truncate">
                  <p className="text-sm text-light/60">Landhoney USDC address:</p>
                  <p className="text-sm">{address}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-light/5 rounded-lg transition-colors relative group"
                >
                  {copySuccess ? (
                    <CheckCircleIcon className="w-5 h-5 text-[#00D54B]" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5 text-light/60" />
                  )}
                  <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-dark text-light text-xs rounded whitespace-nowrap transition-opacity ${
                    copySuccess ? 'opacity-100' : 'opacity-0'
                  }`}>
                    Address copied
                  </div>
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <InformationCircleIcon className="w-5 h-5 text-light/60 shrink-0" />
                  <span>Only send USDC to this address</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <InformationCircleIcon className="w-5 h-5 text-light/60 shrink-0" />
                  <span>This address can only receive USDC on the Ethereum network. Sending USDC on any other network will result in lost funds.</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const navigate = useNavigate();

  // Add this helper function at the top of the file
  const formatAmount = (amount: number, type: 'token' | 'usd') => {
    return type === 'token' ? amount.toFixed(4) : amount.toFixed(2);
  };

  if (widgetState === 'payment_instructions') {
    return (
      <div className="max-w-md mx-auto bg-dark/95 p-6 rounded-2xl shadow-xl border border-light/10">
        <h2 className="text-xl font-bold text-light mb-2">Complete Payment</h2>
        <p className="text-light/60 mb-6">You will receive your tokens when the issuer confirms that your payment has arrived.</p>
        
        <div className="mb-6">
          <div className="bg-light/5 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-bold text-light mb-3">
              Order Summary - Buy {formatAmount(tokenAmount, 'token')} {asset.symbol}
            </h3>
            <div className="flex items-center justify-between">
              <span className="font-bold text-light">Total to Pay</span>
              <span className="font-bold text-light">${formatAmount(totalAmount, 'usd')}</span>
            </div>
          </div>
          {renderPaymentInstructions()}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => navigate('/app/invest')}
            className="flex-1 bg-[#00D54B] text-dark font-bold py-3 rounded-xl hover:bg-[#00D54B]/90 transition-colors"
          >
            Keep Investing
          </button>
          <button
            onClick={() => navigate('/app/portfolio')}
            className="flex-1 bg-light/10 text-light font-bold py-3 rounded-xl hover:bg-light/20 transition-colors"
          >
            See my orders
          </button>
        </div>
      </div>
    );
  }

  if (widgetState === 'confirmation') {
    return (
      <div className="max-w-lg mx-auto bg-dark/95 p-6 rounded-2xl shadow-xl border border-light/10">
        <h2 className="text-xl font-bold text-light mb-6">Success - Your order has been created!</h2>
        
        {validationError && (
          <div className="mb-4 p-4 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
            {validationError}
          </div>
        )}
        
        <div className="mb-6">
          <div className="bg-light/5 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-bold text-light mb-4">
              Order Summary - Buy {formatAmount(tokenAmount, 'token')} {asset.symbol}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-light/60">Order Confirmation Number</span>
                <span className="text-light">#{transaction?.id.slice(-8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light/60">Price per token</span>
                <span className="text-light">${formatAmount(asset.price_per_token, 'usd')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light/60">Net investment</span>
                <span className="text-light">${formatAmount(usdAmount, 'usd')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-light/60">Fee (0.5%)</span>
                <span className="text-light">${formatAmount(platformFee, 'usd')}</span>
              </div>
              <div className="border-t border-light/10 my-2" />
              <div className="flex justify-between font-bold">
                <span className="text-light">Total to Pay</span>
                <span className="text-light">${formatAmount(totalAmount, 'usd')}</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleShowPaymentInstructions}
          className="w-full bg-[#00D54B] text-dark font-bold py-3 rounded-xl hover:bg-[#00D54B]/90 transition-colors"
        >
          View Payment Instructions
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-[#1E1E1E] p-6 rounded-2xl shadow-xl border border-light/10">
      <div className="flex justify-between items-center mb-8">
        <div className="flex-1" />
        <h2 className="flex-1 text-xl font-semibold text-center whitespace-nowrap">
          {widgetState === 'review' ? 'Confirm Investment' : `Invest in ${asset.symbol}`}
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
        {validationError && (
          <div className="p-4 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
            {validationError}
          </div>
        )}

        {/* You're Buying Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-light">You're Buying</h3>
            <div className="flex items-center">
              <span className="text-light/60 text-sm">Your balance:</span>
              <p className="text-light text-sm ml-2">{formatAmount(userBalance, 'token')} {asset.symbol}</p>
            </div>
          </div>
          
          {/* Amount Type Label */}
          <p className="text-sm text-light/60 mb-2">Investment amount in:</p>

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
            Price per token: ${formatAmount(asset.price_per_token, 'usd')}
          </div>
        </div>

        {/* You're Paying With Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h3 className="text-lg font-bold text-light mb-4">You're Paying With</h3>
          <div className="relative">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'USD' | 'USDC')}
              disabled={widgetState === 'review'}
              className="w-full appearance-none bg-light/10 text-light pl-4 pr-12 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="USD">USD</option>
              <option value="USDC">USDC</option>
            </select>
            <ChevronDownIcon className="w-5 h-5 text-light absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* You Receive Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h3 className="text-lg font-bold text-light mb-4">You Receive</h3>
          <div className="flex items-center">
            <span className="text-light">{formatAmount(tokenAmount, 'token')} {asset.symbol}</span>
          </div>
        </div>

        {/* Investment limits info */}
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
          {/* Only show fee and min/max for debt assets */}
          <div className="text-sm text-light/60">
            <div className="flex items-center gap-1">
              <span>Fee (0.5%)</span>
              <Tooltip content="Platform fee">
                <InformationCircleIcon className="w-4 h-4" />
              </Tooltip>
              <span>= ${formatAmount(platformFee, 'usd')}</span>
            </div>
            {asset.type === 'debt' && (
              <div>Min ${asset.min_investment.toLocaleString()} - Max ${asset.max_investment.toLocaleString()}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 