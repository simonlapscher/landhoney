import React, { useState } from 'react';
import { Tooltip } from '../common/Tooltip';
import { DebtAsset } from '../../lib/types/asset';
import { Modal } from '../common/Modal';
import { InvestWidget } from './InvestWidget';

interface InvestmentBoxProps {
  asset: DebtAsset;
  userBalance?: number;
  onInvest: () => void;
  onSell: () => void;
}

export const InvestmentBox: React.FC<InvestmentBoxProps> = ({
  asset,
  userBalance = 0,
  onInvest,
  onSell,
}) => {
  const [showInvestModal, setShowInvestModal] = useState(false);

  // Calculate funding progress
  const fundingGoal = asset.loan_amount;
  const fundedAmount = asset.funded_amount || 0;
  const remainingAmount = fundingGoal - fundedAmount;
  const percentageFunded = (fundedAmount / fundingGoal) * 100;

  return (
    <>
      <div className="bg-secondary rounded-lg p-6 sticky top-4">
        {/* User Balance */}
        <div className="mb-6 flex items-center gap-2">
          <p className="text-light/60 text-sm">Your balance</p>
          <p className="text-light text-sm">
            ${userBalance.toLocaleString()}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center">
            <Tooltip content="Annual Percentage Rate - The yearly interest rate charged on the loan">
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{asset.apr}%</p>
                <p className="text-sm text-light/60 mt-1">APR</p>
              </div>
            </Tooltip>
          </div>
          <div className="flex flex-col items-center">
            <Tooltip content="Loan to Value - The ratio of the loan amount to the property's value">
              <div className="text-center">
                <p className="text-2xl text-light font-medium">{asset.ltv}%</p>
                <p className="text-sm text-light/60 mt-1">LTV</p>
              </div>
            </Tooltip>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-center">
              <p className="text-2xl text-light font-medium">{asset.term_months} Mo.</p>
              <p className="text-sm text-light/60 mt-1">Term</p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2 mb-6">
          <div className="w-full bg-dark rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full"
              style={{ width: `${percentageFunded}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-light/60">
              ${remainingAmount.toLocaleString()} remaining
            </span>
            <span className="text-light/60">{Math.round(percentageFunded)}%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowInvestModal(true)}
            className="flex-1 bg-[#00D54B] text-dark font-medium py-3 px-6 rounded-lg hover:bg-[#00D54B]/90 transition-colors"
          >
            Invest
          </button>
          <button
            onClick={onSell}
            className="flex-1 bg-[#3A3A3A] text-light/60 font-medium py-3 px-6 rounded-lg hover:bg-[#3A3A3A]/90 transition-colors"
          >
            Sell
          </button>
        </div>

        {/* Investment Range */}
        <div className="mt-4 text-sm text-light/60 text-center">
          Min. ${asset.min_investment.toLocaleString()} - Max. ${asset.max_investment.toLocaleString()}
        </div>
      </div>

      {/* Invest Modal */}
      <Modal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
      >
        <InvestWidget
          asset={asset}
          onClose={() => setShowInvestModal(false)}
        />
      </Modal>
    </>
  );
}; 