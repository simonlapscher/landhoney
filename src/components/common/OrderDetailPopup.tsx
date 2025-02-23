import React from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { TransactionWithAsset } from '../../lib/types/transaction';
import { formatCurrency, formatTokenAmount } from '../../lib/utils/formatters';

interface OrderDetailPopupProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionWithAsset;
}

export const OrderDetailPopup: React.FC<OrderDetailPopupProps> = ({
  isOpen,
  onClose,
  transaction
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-2xl bg-dark-2 p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-semibold text-light">
              Order Details
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-light/60 hover:text-light"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-light/60">Type</span>
              <span className="text-light capitalize">{transaction.type}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-light/60">Amount</span>
              <div className="text-right">
                <div className="text-light">
                  {formatCurrency(transaction.amount * transaction.price_per_token)}
                </div>
                <div className="text-sm text-light/60">
                  {formatTokenAmount(transaction.amount)} {transaction.asset.symbol}
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-light/60">Price per Token</span>
              <span className="text-light">
                {formatCurrency(transaction.price_per_token)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-light/60">Status</span>
              <span className={`capitalize ${
                transaction.status === 'completed' ? 'text-green-500' :
                transaction.status === 'failed' ? 'text-red-500' :
                transaction.status === 'pending' ? 'text-yellow-500' :
                'text-light/60'
              }`}>
                {transaction.status}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-light/60">Date</span>
              <span className="text-light">
                {formatDate(transaction.created_at)}
              </span>
            </div>

            {transaction.completed_at && (
              <div className="flex justify-between">
                <span className="text-light/60">Completed</span>
                <span className="text-light">
                  {formatDate(transaction.completed_at)}
                </span>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}; 