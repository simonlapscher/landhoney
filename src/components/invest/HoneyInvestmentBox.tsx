import React, { useState, useEffect } from 'react';
import { Asset } from '../../lib/types/asset';
import { InvestWidget } from './InvestWidget';
import { SellWidget } from './SellWidget';
import { Modal } from '../common/Modal';
import { supabase } from '../../lib/supabase';

interface HoneyInvestmentBoxProps {
  asset: Asset;
  userBalance: number;
  onInvest: () => void;
  onSell: () => void;
}

export const HoneyInvestmentBox: React.FC<HoneyInvestmentBoxProps> = ({
  asset,
  userBalance = 0,
  onInvest,
  onSell,
}) => {
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [latestPrice, setLatestPrice] = useState<number>(asset.price_per_token);

  useEffect(() => {
    const fetchLatestPrice = async () => {
      try {
        const { data, error } = await supabase
          .from('assets')
          .select('price_per_token')
          .eq('symbol', 'HONEY')
          .single();

        if (error) throw error;
        if (data) {
          setLatestPrice(data.price_per_token);
        }
      } catch (err) {
        console.error('Error fetching latest price:', err);
      }
    };

    fetchLatestPrice();

    // Set up real-time subscription for price updates
    const subscription = supabase
      .channel('price_updates')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'assets',
          filter: 'symbol=eq.HONEY'
        }, 
        (payload) => {
          if (payload.new && 'price_per_token' in payload.new) {
            setLatestPrice(payload.new.price_per_token as number);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <div className="bg-secondary rounded-lg p-6 sticky top-4">
        {/* User Balance */}
        <div className="mb-6">
          <div className="flex items-center">
            <p className="text-light/60 text-sm">Your balance</p>
            <p className="text-light text-sm ml-2">{userBalance.toFixed(2)} HONEY</p>
          </div>
        </div>

        {/* Price Info */}
        <div className="mb-6">
          <p className="text-light/60 text-sm mb-1">Price</p>
          <div className="flex items-baseline">
            <p className="text-light text-2xl font-medium">
              ${latestPrice.toLocaleString()}
            </p>
            <p className="text-light/60 text-sm ml-2">per Honey</p>
          </div>
          <p className="text-light/60 text-sm mt-2">1 HONEY = 1oz of gold</p>
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
            onClick={() => setShowSellModal(true)}
            className="flex-1 bg-[#3A3A3A] text-light/60 font-medium py-3 px-6 rounded-lg hover:bg-[#3A3A3A]/90 transition-colors"
          >
            Sell
          </button>
        </div>
      </div>

      {/* Invest Modal */}
      <Modal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
      >
        <InvestWidget
          asset={{...asset, price_per_token: latestPrice}}
          onClose={() => setShowInvestModal(false)}
        />
      </Modal>

      {/* Sell Modal */}
      <Modal
        isOpen={showSellModal}
        onClose={() => setShowSellModal(false)}
      >
        <SellWidget
          asset={{...asset, price_per_token: latestPrice}}
          onClose={() => setShowSellModal(false)}
        />
      </Modal>
    </>
  );
}; 