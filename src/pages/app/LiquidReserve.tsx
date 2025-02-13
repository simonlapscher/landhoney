import React, { useEffect, useState } from 'react';
import { Pool, PoolBalance } from '../../lib/types/pool';
import { poolService } from '../../lib/services/poolService';
import { formatCurrency } from '../../lib/utils/formatters';
import { useAuth } from '../../lib/context/AuthContext';
import { BitcoinStakingModal } from '../../components/app/BitcoinStakingModal';
import { HoneyStakingModal } from '../../components/app/HoneyStakingModal';
import { supabase } from '../../lib/supabase';
import { StakingInfo, BitcoinStakingInfo, DatabasePool, DatabaseAsset, DatabaseBalance } from '../../lib/types/portfolio';
import { transactionService } from '../../lib/services/transactionService';
import { ExtendedAsset } from '../../lib/types/asset';

interface PoolStats {
  mainAssetBalance: number;
  debtAssets: Array<{
    balance: number;
    asset: DatabaseAsset;
  }>;
  totalDebtValue: number;
  totalValueLocked: number;
}

interface SupabaseUserBalance {
  balance: number;
  assets: {
    price_per_token: number;
  };
}

interface SupabaseStakedBalance {
  asset_id: string;
  balance: number;
  assets: {
    symbol: string;
    price_per_token: number;
  };
}

export const LiquidReserve: React.FC = () => {
  const { user } = useAuth();
  const [pools, setPools] = useState<DatabasePool[]>([]);
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
        console.log('Fetching pool data...');
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
        
        // Log the data to debug
        console.log('Pool data:', data);
        
        if (data) {
          // Ensure we're getting the correct data for each pool
          data.forEach(pool => {
            console.log(`${pool.type} pool:`, {
              mainAsset: pool.main_asset,
              poolAssets: pool.pool_assets,
              tvl: pool.total_value_locked
            });
          });
          
          setPools(data as unknown as DatabasePool[]);
        }
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

        const typedBtcBalance = btcBalance as unknown as SupabaseUserBalance;
        const typedHoneyBalance = honeyBalance as unknown as SupabaseUserBalance;

        setUserBalances({
          bitcoin: typedBtcBalance?.balance || 0,
          honey: typedHoneyBalance?.balance || 0,
          bitcoinPrice: typedBtcBalance?.assets?.price_per_token || 0,
          honeyPrice: typedHoneyBalance?.assets?.price_per_token || 0
        });
      } catch (err) {
        console.error('Error fetching user balances:', err);
      }
    };

    fetchUserBalances();
  }, [user, refreshTrigger]);

  const fetchStakingInfo = async () => {
    if (!user?.id) return;
    
    const honeyInfo = await transactionService.getHoneyStakingInfo(user.id);
    const btcInfo = await transactionService.getBitcoinStakingInfo(user.id);
    
    if (honeyInfo) {
      setStakingInfo({
        honeyBalance: honeyInfo.honeyBalance,
        honeyXBalance: honeyInfo.honeyXBalance,
        stakingPercentage: honeyInfo.stakingPercentage
      });
    }
    
    if (btcInfo) {
      setBtcStakingInfo({
        bitcoinBalance: btcInfo.bitcoinBalance,
        bitcoinXBalance: btcInfo.bitcoinXBalance,
        stakingPercentage: btcInfo.stakingPercentage
      });
    }
  };

  useEffect(() => {
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

  const calculatePoolBalances = (pool: DatabasePool): PoolStats => {
    // If no pool assets but has TVL, use that for main asset calculation
    if (!pool.pool_assets || pool.pool_assets.length === 0) {
      const mainAssetBalance = pool.total_value_locked / pool.main_asset.price_per_token;
      
      return {
        mainAssetBalance,
        debtAssets: [],
        totalDebtValue: 0,
        totalValueLocked: pool.total_value_locked
      };
    }

    // Normal calculation for pools with assets
    const mainAssetBalance = pool.pool_assets?.find(
      pa => pa.asset.id === pool.main_asset.id
    )?.balance || 0;

    // Only count non-main assets with balance > 0 as debt assets
    const debtAssets = pool.pool_assets?.filter(
      pa => pa.asset.id !== pool.main_asset.id && pa.balance > 0
    ) || [];

    // Calculate main asset value
    const mainAssetValue = mainAssetBalance * pool.main_asset.price_per_token;

    // Calculate total debt value
    const totalDebtValue = debtAssets.reduce((sum: number, pa) => 
      sum + (pa.balance * pa.asset.price_per_token), 0
    );

    // Total Value Locked is sum of main asset value and debt assets value
    const totalValueLocked = mainAssetValue + totalDebtValue;

    return {
      mainAssetBalance,
      debtAssets,
      totalDebtValue,
      totalValueLocked
    };
  };

  const calculatePoolRatios = (pool: DatabasePool, mainAssetBalance: number, debtAssets: Array<{
    balance: number;
    asset: DatabaseAsset;
  }>) => {
    const mainAssetValue = mainAssetBalance * pool.main_asset.price_per_token;
    const debtAssetsValue = debtAssets.reduce((sum: number, pa) => 
      sum + (pa.balance * pa.asset.price_per_token), 0
    );
    
    const total = mainAssetValue + debtAssetsValue;
    return {
      mainAssetRatio: total > 0 ? (mainAssetValue / total) * 100 : 100,
      debtAssetsRatio: total > 0 ? (debtAssetsValue / total) * 100 : 0
    };
  };

  const syncPoolBalances = async () => {
    try {
      // Get all staked assets (BTCX and HONEYX balances)
      const { data: stakedBalances } = await supabase
        .from('user_balances')
        .select(`
          asset_id,
          balance,
          assets!inner (
            symbol,
            price_per_token
          )
        `)
        .in('assets.symbol', ['BTCX', 'HONEYX']);

      if (!stakedBalances) return;

      const typedStakedBalances = stakedBalances as unknown as SupabaseStakedBalance[];

      // Group staked balances by asset
      const totalStaked = typedStakedBalances.reduce((acc: Record<string, { total: number; mainAssetSymbol: string }>, balance) => {
        const isHoney = balance.assets.symbol === 'HONEYX';
        const key = isHoney ? 'honey' : 'bitcoin';
        const mainAssetSymbol = isHoney ? 'HONEY' : 'BTC';
        
        if (!acc[key]) {
          acc[key] = { total: 0, mainAssetSymbol };
        }
        acc[key].total += balance.balance;
        return acc;
      }, {});

      // Update pool balances based on staked amounts
      await Promise.all(
        Object.entries(totalStaked).map(async ([poolType, { total, mainAssetSymbol }]) => {
          const pool = pools.find(p => p.type === poolType);
          if (!pool) return;

          const { data: mainAsset } = await supabase
            .from('assets')
            .select('id, price_per_token')
            .eq('symbol', mainAssetSymbol)
            .single();

          if (!mainAsset) return;

          // Update pool assets with new staked amount
          const { error } = await supabase
            .from('pool_assets')
            .upsert({
              pool_id: pool.id,
              asset_id: mainAsset.id,
              balance: total
            }, {
              onConflict: 'pool_id,asset_id'
            });

          if (error) {
            console.error('Error updating pool assets:', error);
          }
        })
      );

      // Refresh pool data
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error syncing pool balances:', err);
    }
  };

  const renderStakingModals = () => {
    if (!user?.id || !stakingInfo || !btcStakingInfo) return null;

    return (
      <>
        {honeyAsset && (
          <HoneyStakingModal
            isOpen={showHoneyStakingModal}
            onClose={() => setShowHoneyStakingModal(false)}
            onSuccess={() => {
              fetchStakingInfo();
              syncPoolBalances();
              handleStakingSuccess();
            }}
            honeyBalance={userBalances.honey}
            honeyXBalance={stakingInfo.honeyXBalance}
            stakingPercentage={stakingInfo.stakingPercentage}
            pricePerToken={userBalances.honeyPrice}
            userId={user.id}
            honeyAsset={honeyAsset}
          />
        )}
        {btcAsset && (
          <BitcoinStakingModal
            isOpen={showBitcoinStakingModal}
            onClose={() => setShowBitcoinStakingModal(false)}
            onSuccess={() => {
              fetchStakingInfo();
              syncPoolBalances();
              handleStakingSuccess();
            }}
            bitcoinBalance={userBalances.bitcoin}
            bitcoinXBalance={btcStakingInfo.bitcoinXBalance}
            stakingPercentage={btcStakingInfo.stakingPercentage}
            pricePerToken={userBalances.bitcoinPrice}
            userId={user.id}
          />
        )}
      </>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-light">Liquid Reserve</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pools.map(pool => {
          const { mainAssetBalance, debtAssets, totalDebtValue, totalValueLocked } = calculatePoolBalances(pool);
          const hasDebtAssets = debtAssets.length > 0;
          const { mainAssetRatio, debtAssetsRatio } = calculatePoolRatios(pool, mainAssetBalance, debtAssets);

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
                  className={`text-dark font-medium py-2 px-6 rounded-xl hover:opacity-90 transition-colors ${
                    pool.type === 'bitcoin'
                      ? 'bg-gradient-to-r from-[#F7931A] to-[#FFAB4A]'
                      : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]'
                  }`}
                >
                  Add liquidity
                </button>
              </div>

              {/* Pool Stats */}
              <div className="mb-6">
                <div className="text-sm text-light/60 mb-1">Total Value Locked</div>
                <div className="text-2xl font-medium text-light">
                  {formatCurrency(totalValueLocked)}
                </div>
              </div>

              {/* Pool Balances */}
              <div className="mt-6">
                <h3 className="text-light/60 mb-2">Pool Balances</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-base font-medium">
                    <span>{Number(mainAssetBalance).toFixed(pool.type === 'bitcoin' ? 8 : 2)} {pool.main_asset.symbol}</span>
                    {hasDebtAssets && (
                      <span>{formatCurrency(totalDebtValue)} Debt Assets</span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="flex bg-dark-3 rounded-full h-2 overflow-hidden">
                      {/* Main asset portion */}
                      <div
                        className="h-full"
                        style={{
                          width: `${mainAssetRatio}%`,
                          background: pool.type === 'bitcoin' 
                            ? 'linear-gradient(90deg, #F7931A 0%, #FFAB4A 100%)'
                            : 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)'
                        }}
                      />
                      {/* Debt assets portion */}
                      {hasDebtAssets && (
                        <>
                          <div className="h-full w-[2px] bg-[#1A1A1A]" />
                          <div 
                            className="h-full"
                            style={{ 
                              width: `${debtAssetsRatio}%`,
                              background: 'linear-gradient(90deg, #00D54B 0%, #00FF5B 100%)'
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Debt Asset Holdings - Only show if there are debt assets */}
              {hasDebtAssets && (
                <div className="mt-6">
                  <h3 className="text-light/60 mb-2">Debt Asset Holdings</h3>
                  <div className="space-y-2">
                    {debtAssets.map(pa => (
                      <div key={pa.asset.id} className="flex justify-between">
                        <span>{pa.asset.symbol}</span>
                        <span>{formatCurrency(pa.balance * pa.asset.price_per_token)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {renderStakingModals()}
    </div>
  );
}; 