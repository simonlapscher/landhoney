import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/format';

interface OrderDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: {
    id: string;
    type: 'buy' | 'sell' | 'stake' | 'unstake' | 'loan_distribution' | 'earn';
    amount: number;
    price_per_token: number;
    created_at: string;
    status: string;
    asset: {
      symbol: string;
    };
    metadata?: {
      payment_method?: string;
      fee?: number;
      distribution_id?: string;
      distribution_type?: string;
      debt_asset_symbol?: string;
    };
  };
}

export const OrderDetailPopup: React.FC<OrderDetailPopupProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  if (!isOpen) return null;

  const getStatusDot = (status: string) => {
    const baseClasses = "inline-block w-2 h-2 rounded-full mr-2";
    switch (status) {
      case 'completed':
        return <span className={`${baseClasses} bg-[#00D897]`} />;
      case 'pending':
        return <span className={`${baseClasses} bg-[#FFD700]`} />;
      case 'failed':
      case 'cancelled':
        return <span className={`${baseClasses} bg-[#FF4444]`} />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const subtotalAmount = transaction.amount * transaction.price_per_token;
  const getFee = () => {
    // If fee is specified in metadata, use that
    if (transaction.metadata?.fee) {
      return transaction.metadata.fee;
    }
    
    // For buy/sell transactions, use 0.5%
    if (transaction.type === 'buy' || transaction.type === 'sell') {
      return subtotalAmount * 0.005;
    }
    
    // For other transaction types, return 0
    return 0;
  };

  const fee = getFee();
  const totalAmount = subtotalAmount + fee;

  return (
    <>
      {/* Semi-transparent overlay */}
      <div 
        className="fixed inset-0 bg-black/40 z-50"
        onClick={onClose}
      />
      
      {/* Popup */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-[#1A1A1A] rounded-lg w-full max-w-md mx-4 overflow-hidden pointer-events-auto shadow-xl border border-[#2D2D2D]">
          {/* Header */}
          <div className="relative p-6 text-center border-b border-[#2D2D2D]">
            <h2 className="text-xl font-medium text-light">
              {transaction.type === 'buy' ? 'Bought' : 
               transaction.type === 'sell' ? 'Sold' :
               transaction.type === 'stake' ? 'Staked' :
               transaction.type === 'earn' ? 'Earned' :
               transaction.type === 'loan_distribution' ? `Loan Distribution for ${transaction.metadata?.debt_asset_symbol}` :
               'Unstaked'} {transaction.type !== 'loan_distribution' && transaction.asset.symbol}
            </h2>
            <button
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-light/60 hover:text-light transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Amount Display */}
          <div className="px-6 py-8 text-center border-b border-[#2D2D2D]">
            <div className="text-4xl font-medium text-[#00D897]">
              {(subtotalAmount).toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
            <div className="text-light/60 mt-1">
              {transaction.amount} {transaction.asset.symbol}
            </div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-light/60">Reference code</span>
              <span className="text-light font-mono">{transaction.id.slice(0, 8).toUpperCase()}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-light/60">Price</span>
              <span className="text-light">
                {transaction.price_per_token.toLocaleString('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>

            {(transaction.type === 'buy' || transaction.type === 'sell') && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-light/60">Payment method</span>
                  <span className="text-light">
                    {transaction.metadata?.payment_method || 'USDC'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-light/60">Subtotal</span>
                  <span className="text-light">
                    {subtotalAmount.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-light/60">Landhoney fee</span>
                  <span className="text-light">
                    {fee.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between items-center font-medium">
              <span className="text-light/60">Total</span>
              <span className="text-light">
                {(transaction.type === 'buy' || transaction.type === 'sell' ? totalAmount : subtotalAmount)
                  .toLocaleString('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-light/60">Date</span>
              <span className="text-light">{formatDate(transaction.created_at)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-light/60">Status</span>
              <span className="text-light flex items-center">
                {getStatusDot(transaction.status)}
                <span className="capitalize">{transaction.status}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}; 