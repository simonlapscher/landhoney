import React, { useState, useEffect } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/solid';
import { Tooltip } from '../common/Tooltip';
import { DebtAsset } from '../../lib/types/asset';
import { Modal } from '../common/Modal';
import { InvestWidget } from './InvestWidget';
import { supabase } from '../../lib/supabase';

interface InvestmentBoxProps {
  asset: DebtAsset;
  userBalance: number;
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
  const [totalFundedAmount, setTotalFundedAmount] = useState(0);

  useEffect(() => {
    const fetchTotalFunding = async () => {
      const { data, error } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('asset_id', asset.id);

      if (!error && data) {
        const total = data.reduce((sum, record) => sum + (record.balance || 0), 0);
        setTotalFundedAmount(total);
      }
    };

    fetchTotalFunding();
  }, [asset.id]);

  // Calculate funding progress
  const fundingGoal = asset.loan_amount;
  const remainingAmount = fundingGoal - totalFundedAmount;
  const percentageFunded = (totalFundedAmount / fundingGoal) * 100;

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
            <div className="text-center w-full">
              <p className="text-2xl text-light font-medium">{asset.apr}%</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-sm text-light/60">APR</p>
                <Tooltip content="Annual Percentage Rate - The yearly interest rate charged on the loan">
                  <InformationCircleIcon className="w-4 h-4 text-light/60 cursor-help" />
                </Tooltip>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-center w-full">
              <p className="text-2xl text-light font-medium">{asset.ltv}%</p>
              <div className="flex items-center justify-center gap-1 mt-1">
                <p className="text-sm text-light/60">LTV</p>
                <Tooltip content="Loan to Value - The ratio of the loan amount to the property's value">
                  <InformationCircleIcon className="w-4 h-4 text-light/60 cursor-help" />
                </Tooltip>
              </div>
            </div>
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
              className="bg-[#00D54B] h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(percentageFunded, 100)}%` }}
            />
          </div>
          <div className="flex justify-end text-sm">
            <span className="text-light/60">
              ${remainingAmount.toLocaleString()} remaining
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowInvestModal(true)}
            className="flex-1 text-dark font-medium py-3 px-6 rounded-lg hover:opacity-90 transition-colors"
            style={{
              background: 'linear-gradient(90deg, #00D54B 0%, #00F76C 100%)'
            }}
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
          userBalance={userBalance}
        />
      </Modal>
    </>
  );
}; 