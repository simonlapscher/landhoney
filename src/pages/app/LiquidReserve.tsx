import React, { useEffect, useState } from 'react';
import { Pool, PoolBalance } from '../../lib/types/pool';
import { poolService } from '../../lib/services/poolService';
import { formatCurrency } from '../../lib/utils/formatters';
import { useAuth } from '../../lib/context/AuthContext';
import { BitcoinStakingModal } from '../../components/app/BitcoinStakingModal';
import { HoneyStakingModal } from '../../components/app/HoneyStakingModal';
import { supabase } from '../../lib/supabase';
import { StakingInfo, BitcoinStakingInfo } from '../../components/app/Portfolio';
import { transactionService } from '../../lib/services/transactionService';
import { ExtendedAsset } from '../../lib/types/asset';

export const LiquidReserve: React.FC = () => {
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [poolBalances, setPoolBalances] = useState<Record<string, PoolBalance[]>>({});
  const [showBitcoinStakingModal, setShowBitcoinStakingModal] = useState(false);
  const [showHoneyStakingModal, setShowHoneyStakingModal] = useState(false);
  const [showHoneyUnstakingModal, setShowHoneyUnstakingModal] = useState(false);
  const [showBitcoinUnstakingModal, setShowBitcoinUnstakingModal] = useState(false);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [btcStakingInfo, setBtcStakingInfo] = useState<BitcoinStakingInfo | null>(null);
  const [honeyAsset, setHoneyAsset] = useState<ExtendedAsset | null>(null);
  const [btcAsset, setBtcAsset] = useState<ExtendedAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userBalances, setUserBalances] = useState<{
    bitcoin: number;
    honey: number;
    bitcoinPrice: number;
    honeyPrice: number;
  }>({
    bitcoin: 0,
    honey: 0,
    bitcoinPrice: 0,
    honeyPrice: 0
  });

  const handleStakingSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        const { data, error } = await supabase
          .from('pools')
          .select(`
            id,
            type,
            total_value_locked,
            apr,
            main_asset:assets!pools_main_asset_id_fkey (
              id,
              symbol,
              name,
              price_per_token
            ),
            pool_assets (
              balance,
              asset:assets (
                id,
                symbol,
                name,
                price_per_token
              )
            )
          `);

        if (error) throw error;
        setPools(data || []);
      } catch (err) {
        console.error('Error fetching pool data:', err);
      }
    };

    fetchPoolData();
  }, [refreshTrigger]);

  useEffect(() => {
    const fetchUserBalances = async () => {
      if (!user) return;

      try {
        // Fetch BTC balance
        const { data: btcBalance } = await supabase
          .from('user_balances')
          .select('balance, assets!inner(price_per_token)')
          .eq('user_id', user.id)
          .eq('assets.symbol', 'BTC')
          .single();

        // Fetch HONEY balance
        const { data: honeyBalance } = await supabase
          .from('user_balances')
          .select('balance, assets!inner(price_per_token)')
          .eq('user_id', user.id)
          .eq('assets.symbol', 'HONEY')
          .single();

        setUserBalances({
          bitcoin: btcBalance?.balance || 0,
          honey: honeyBalance?.balance || 0,
          bitcoinPrice: btcBalance?.assets.price_per_token || 0,
          honeyPrice: honeyBalance?.assets.price_per_token || 0
        });
      } catch (err) {
        console.error('Error fetching user balances:', err);
      }
    };

    fetchUserBalances();
  }, [user, refreshTrigger]);

  useEffect(() => {
    const fetchStakingInfo = async () => {
      if (!user?.id) return;
      
      const honeyInfo = await transactionService.getHoneyStakingInfo(user.id);
      const btcInfo = await transactionService.getBitcoinStakingInfo(user.id);
      
      setStakingInfo(honeyInfo);
      setBtcStakingInfo(btcInfo);
    };

    fetchStakingInfo();
  }, [user?.id]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!user?.id) return;
      
      const { data: honeyData } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'HONEY')
        .single();
        
      const { data: btcData } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'BTC')
        .single();
        
      if (honeyData) setHoneyAsset(honeyData);
      if (btcData) setBtcAsset(btcData);
    };
    
    fetchAssets();
  }, [user?.id]);

  const getAssetIcon = (type: string) => {
    const baseUrl = 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets';
    const icons = {
      bitcoin: `${baseUrl}/bitcoin-btc-logo.png`,
      honey: `${baseUrl}/Honey%20gradient.png`
    };
    
    return icons[type as keyof typeof icons];
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-light">Liquid Reserve</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pools.map(pool => {
          // Calculate main asset balance and value
          const mainAssetBalance = pool.total_value_locked / pool.main_asset.price_per_token;
          const mainAssetValue = pool.total_value_locked;

          // Calculate total debt assets value
          const debtAssetsValue = pool.pool_assets?.reduce((sum, pa) => 
            sum + (pa.balance * pa.asset.price_per_token), 0) || 0;

          // Calculate total pool value (main asset + debt assets)
          const totalPoolValue = mainAssetValue + debtAssetsValue;

          // Calculate percentages for the bar
          const mainAssetPercentage = (mainAssetValue / totalPoolValue) * 100;
          const debtAssetsPercentage = (debtAssetsValue / totalPoolValue) * 100;

          return (
            <div key={pool.id} className="bg-[#1A1A1A] rounded-xl border border-light/10 p-6">
              {/* Pool Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1E1E1E] flex items-center justify-center">
                    <img 
                      src={getAssetIcon(pool.type)}
                      alt={pool.type}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(`Failed to load image for ${pool.type}`);
                        e.currentTarget.src = 'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/logo-negative.png';
                      }}
                    />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-light">
                      {pool.type === 'bitcoin' ? 'Bitcoin' : 'Honey'} Pool
                    </h2>
                    <p className="text-sm text-light/60">
                      APR: {pool.apr}%
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => pool.type === 'bitcoin' 
                    ? setShowBitcoinStakingModal(true) 
                    : setShowHoneyStakingModal(true)
                  }
                  className="bg-[#00D54B] text-dark px-4 py-2 rounded-xl font-medium hover:bg-[#00D54B]/90 transition-colors"
                >
                  Add liquidity
                </button>
              </div>

              {/* Pool Stats */}
              <div className="mb-6">
                <div className="text-sm text-light/60 mb-1">Total Value Locked</div>
                <div className="text-2xl font-medium text-light">
                  {formatCurrency(totalPoolValue)}
                </div>
              </div>

              {/* Pool Balances */}
              <div className="space-y-4">
                <div className="text-sm text-light/60">Pool Balances</div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-light">
                      {mainAssetBalance.toFixed(pool.type === 'bitcoin' ? 8 : 2)} {pool.type === 'bitcoin' ? 'BTC' : 'HONEY'}
                    </span>
                    {debtAssetsValue > 0 && (
                      <span className="text-light">
                        {formatCurrency(debtAssetsValue)} Debt Assets
                      </span>
                    )}
                  </div>
                  <div className="h-2 bg-light/10 rounded-full overflow-hidden flex">
                    {/* Main asset portion */}
                    <div 
                      className="h-full"
                      style={{ 
                        width: `${mainAssetPercentage}%`,
                        background: pool.type === 'bitcoin' 
                          ? 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
                          : `url(${getAssetIcon('honey')})`,
                        backgroundSize: 'cover'
                      }}
                    />
                    {/* Small divider if there are debt assets */}
                    {debtAssetsValue > 0 && (
                      <div className="h-full w-[2px] bg-[#1A1A1A]" />
                    )}
                    {/* Debt assets portion */}
                    {debtAssetsValue > 0 && (
                      <div 
                        className="h-full"
                        style={{ 
                          width: `${debtAssetsPercentage}%`,
                          background: 'linear-gradient(90deg, #00D54B 0%, #00FF5B 100%)'
                        }}
                      />
                    )}
                  </div>
                </div>
                
                {/* Debt asset holdings */}
                {pool.pool_assets && pool.pool_assets.length > 0 && (
                  <div className="mt-4">
                    <div className="text-sm text-light/60 mb-2">Debt Asset Holdings</div>
                    {pool.pool_assets.map(pa => (
                      <div key={pa.asset.symbol} className="flex justify-between text-sm">
                        <span className="text-gray-400">{pa.asset.symbol}</span>
                        <span className="text-light">{pa.balance.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <HoneyStakingModal
        isOpen={showHoneyStakingModal}
        onClose={() => setShowHoneyStakingModal(false)}
        onSuccess={() => {
          setShowHoneyStakingModal(false);
          fetchStakingInfo(); // Refresh data
        }}
        honeyBalance={stakingInfo?.honeyBalance || 0}
        honeyXBalance={stakingInfo?.honeyXBalance || 0}
        stakingPercentage={stakingInfo?.stakingPercentage || 0}
        pricePerToken={honeyAsset?.price_per_token || 0}
        userId={user?.id || ''}
      />

      <BitcoinStakingModal
        isOpen={showBitcoinStakingModal}
        onClose={() => setShowBitcoinStakingModal(false)}
        onSuccess={() => {
          setShowBitcoinStakingModal(false);
          fetchStakingInfo(); // Refresh data
        }}
        bitcoinBalance={btcStakingInfo?.bitcoinBalance || 0}
        bitcoinXBalance={btcStakingInfo?.bitcoinXBalance || 0}
        stakingPercentage={btcStakingInfo?.stakingPercentage || 0}
        pricePerToken={btcAsset?.price_per_token || 0}
        userId={user?.id || ''}
      />
    </div>
  );
}; 