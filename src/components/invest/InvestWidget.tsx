import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { PencilIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { Asset } from '../../lib/types/asset';
import { Tooltip } from '../common/Tooltip';
import { useNavigate, Link } from 'react-router-dom';
import { transactionService } from '../../lib/services/transactionService';
import { useAuth } from '../../lib/context/AuthContext';
import { Transaction } from '../../lib/types/transaction';
import { useBalances } from '../../lib/hooks/useBalances';
import { formatCurrency } from '../../lib/utils/formatters';
import { toast } from 'react-hot-toast';

type PaymentMethodData = 'usd_balance';

interface InvestWidgetProps {
  asset: Asset;
  onClose: () => void;
  userBalance?: number;
  onSuccess?: () => void;
}

type WidgetState = 'input' | 'review' | 'confirmation';

export const InvestWidget: React.FC<InvestWidgetProps> = ({ asset, onClose, userBalance = 0, onSuccess }) => {
  // Input state
  const [amount, setAmount] = useState<string>('');
  const [amountType, setAmountType] = useState<'USD' | 'Token'>('USD');
  const [widgetState, setWidgetState] = useState<WidgetState>('input');
  const [showSuccess, setShowSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const { originalUser, isLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { user } = useAuth();
  const { balances } = useBalances();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData>('usd_balance');
  const [inputError, setInputError] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodData | null>(null);
  const [stakingInfo, setStakingInfo] = useState<{ balance: number, xBalance: number } | null>(null);
  
  // Get USD balance
  const usdBalance = balances?.find(b => b.asset.symbol === 'USD')?.balance || 0;

  // Fetch staking info when component mounts
  useEffect(() => {
    const fetchStakingInfo = async () => {
      if (!user?.id || !['BTC', 'HONEY'].includes(asset.symbol)) return;

      try {
        if (asset.symbol === 'BTC') {
          const info = await transactionService.getBitcoinStakingInfo(user.id);
          setStakingInfo({
            balance: info.bitcoinBalance,
            xBalance: info.bitcoinXBalance
          });
        } else if (asset.symbol === 'HONEY') {
          const info = await transactionService.getHoneyStakingInfo(user.id);
          setStakingInfo({
            balance: info.honeyBalance,
            xBalance: info.honeyXBalance
          });
        }
      } catch (err) {
        console.error('Error fetching staking info:', err);
      }
    };

    fetchStakingInfo();
  }, [user?.id, asset.symbol]);

  // Calculate total balance including staked tokens
  const totalBalance = stakingInfo 
    ? stakingInfo.balance + stakingInfo.xBalance 
    : userBalance;

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

  // Validate amount based on payment method
  const validateAmount = (amount: number) => {
    if (paymentMethod === 'usd_balance' && amount > usdBalance) {
      return 'Amount exceeds your USD balance';
    }
    if (!originalUser) {
      return 'Please sign in to invest';
    }

    if (asset.type === 'debt') {
      if (usdAmount < asset.min_investment) {
        return `Minimum investment is $${asset.min_investment.toLocaleString()}`;
      }

      if (usdAmount > asset.max_investment) {
        return `Maximum investment is $${asset.max_investment.toLocaleString()}`;
      }
    }

    return null;
  };

  // Add a useEffect to validate amount whenever it changes
  useEffect(() => {
    if (paymentMethod === 'usd_balance' && usdAmount > usdBalance) {
      setInputError('Amount exceeds your USD balance');
    } else {
      setInputError(null);
    }
  }, [usdAmount, usdBalance, paymentMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputError) return;

    // If in input state, move to review state
    if (widgetState === 'input') {
      setWidgetState('review');
      return;
    }

    // Otherwise, proceed with transaction
    setIsSubmitting(true);
    setValidationError(null);

    try {
      if (!user) {
        throw new Error('Please sign in to invest');
      }

      // Create transaction
      const transaction = await transactionService.createBuyTransaction({
        userId: user.id,
        assetId: asset.id,
        amount: tokenAmount,
        pricePerToken: asset.price_per_token,
        paymentMethod: paymentMethod
      });

      setTransaction(transaction);
      setWidgetState('confirmation');
      toast.success('Purchase successful!');
      onSuccess?.();

    } catch (err) {
      console.error('Error processing purchase:', err);
      setValidationError(err instanceof Error ? err.message : 'Failed to process purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setWidgetState('input');
  };

  // Add this helper function at the top of the file
  const formatAmount = (amount: number, type: 'token' | 'usd') => {
    return type === 'token' ? amount.toFixed(4) : amount.toFixed(2);
  };

  // Add this new render function for USD balance success
  const renderSuccessScreen = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-light mb-2">Success - Your order has been created!</h2>
      </div>

      <div className="bg-light/5 p-6 rounded-xl space-y-4">
        <h3 className="text-lg font-medium text-light mb-4">
          Order Summary - Buy {formatAmount(tokenAmount, 'token')} {asset.symbol}
        </h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-light/60">Order Confirmation Number</span>
            <span className="text-light">#{transaction?.id.slice(0, 8)}</span>
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
          <div className="flex justify-between font-medium">
            <span className="text-light">Total to Pay</span>
            <span className="text-light">${formatAmount(totalAmount, 'usd')}</span>
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
  );

  if (widgetState === 'confirmation') {
    return (
      <div className="max-w-lg mx-auto bg-dark/95 p-6 rounded-2xl shadow-xl border border-light/10">
        {renderSuccessScreen()}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-[#1E1E1E] p-6 rounded-2xl shadow-xl border border-light/10">
      <div className="flex justify-between items-center mb-4">
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
      <div className="space-y-4">
        {validationError && (
          <div className="p-3 bg-tertiary-pink/10 border border-tertiary-pink rounded-lg text-tertiary-pink">
            {validationError}
          </div>
        )}

        {/* You're Buying Section */}
        <div className="bg-light/5 p-3 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-light">You're Buying</h3>
            <div className="flex items-center">
              <span className="text-light/60 text-sm">Your balance:</span>
              <p className="text-light text-sm ml-2">{formatAmount(totalBalance, 'token')} {asset.symbol}</p>
            </div>
          </div>
          
          {/* Amount Type Label */}
          <p className="text-sm text-light/60 mb-1">Investment amount in:</p>

          {/* Amount Type Toggle */}
          <div className="flex gap-2 mb-2">
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
              className={`w-full bg-transparent text-light text-4xl font-medium py-4 focus:outline-none ${
                amountType === 'USD' ? 'pl-12' : ''
              }`}
            />
          </div>

          {/* Price per token */}
          <div className="mt-1 text-sm text-light/60">
            Price per token: ${formatAmount(asset.price_per_token, 'usd')}
          </div>
        </div>

        {/* You're Paying With Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h3 className="text-lg font-bold text-light mb-3">You're Paying With</h3>
          <div className="relative">
            <select
              value={selectedPaymentMethod || paymentMethod}
              onChange={(e) => {
                setSelectedPaymentMethod(null);
                setPaymentMethod(e.target.value as PaymentMethodData);
              }}
              disabled={widgetState === 'review' || true}
              className="w-full appearance-none bg-light/10 text-light pl-4 pr-12 py-3 rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="usd_balance">USD Balance</option>
            </select>
            <ChevronDownIcon className="w-5 h-5 text-light absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          
          {/* Show USD balance if USD payment method selected */}
          {paymentMethod === 'usd_balance' && (
            <div className="mt-3 text-sm text-light/60">
              Balance: {formatCurrency(usdBalance)} USD
            </div>
          )}
        </div>

        {/* You Receive Section */}
        <div className="bg-light/5 p-4 rounded-xl">
          <h3 className="text-lg font-bold text-light mb-3">You Receive</h3>
          <div className="flex items-center">
            <span className="text-light">{formatAmount(tokenAmount, 'token')} {asset.symbol}</span>
          </div>
        </div>

        {/* Investment limits info */}
        <div className="flex flex-col gap-3">
          {/* Min/max investment info for debt assets */}
          {asset.type === 'debt' && (
            <div className="text-sm text-light/60">
              Min ${asset.min_investment.toLocaleString()} - Max ${asset.max_investment.toLocaleString()}
            </div>
          )}

          {/* Fee info */}
          <div className="flex items-center justify-between text-sm text-light/60">
            <div className="flex items-center gap-1">
              Fee (0.5%)
              <Tooltip content="Platform fee for processing your investment">
                <InformationCircleIcon className="w-4 h-4" />
              </Tooltip>
            </div>
            <span>${platformFee.toFixed(2)}</span>
          </div>

          {/* Agreement Statement - Only show on review screen for Honey */}
          {widgetState === 'review' && asset.symbol === 'HONEY' && (
            <p className="text-sm text-light/60 mt-2">
              By confirming your purchase of Honey (HNX), you agree to the<br />
              <Link to="/honey-token-agreement" className="text-primary hover:text-primary/80 underline">
                Honey Token Agreement
              </Link>
            </p>
          )}

          {/* Error Messages */}
          {inputError && (
            <div className="border border-red-500/20 bg-red-500/10 text-red-500 p-3 rounded-xl text-sm">
              {inputError}
            </div>
          )}
          {validationError && !inputError && (
            <div className="border border-red-500/20 bg-red-500/10 text-red-500 p-3 rounded-xl text-sm">
              {validationError}
            </div>
          )}

          {/* Button Container */}
          <div className="flex gap-2 mt-2">
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
              disabled={!amount || isSubmitting || !!inputError || !!validationError}
              className={`w-full bg-[#00D54B] text-dark font-bold py-3 rounded-xl 
                disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00D54B]/90 transition-colors`}
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
              ) : inputError ? (
                'Invalid Amount'
              ) : widgetState === 'review' ? (
                'Confirm'
              ) : (
                'Review'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 