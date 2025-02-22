import React, { useEffect, useState } from 'react';
import { formatCurrency } from '../../lib/utils/formatters';
import { useAuth } from '../../lib/context/AuthContext';
import { BitcoinStakingModal } from '../../components/app/BitcoinStakingModal';
import { HoneyStakingModal } from '../../components/app/HoneyStakingModal';
import { supabase } from '../../lib/supabase';
import { DatabaseAsset } from '../../lib/types/portfolio';
import { transactionService } from '../../lib/services/transactionService';
import { ExtendedAsset } from '../../lib/types/asset';

interface PoolStats {
  mainAssetBalance: number;
  mainAssetValue: number;
  apr: number;
}

interface Pool {
  id: string;
  type: 'bitcoin' | 'honey';
  mainAsset: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
  };
  totalValueLocked: number;
  apr: number;
  poolAssets: {
    balance: number;
    asset: {
      id: string;
      symbol: string;
      name: string;
      price_per_token: number;
    };
  }[];
}

interface UserPosition {
  poolId: string;
  balance: number;
  value: number;
  initialStakeValue: number;
  poolReturn: number;
  poolShare: number;
}

interface StakingInfo {
  honeyBalance: number;
  honeyXBalance: number;
  stakingPercentage: number;
}

interface BitcoinStakingInfo {
  bitcoinBalance: number;
  bitcoinXBalance: number;
  stakingPercentage: number;
}

interface DatabasePool {
  id: string;
  type: string;
  total_value_locked: number;
  apr: number;
  main_asset: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
  };
}

interface DatabaseBalance {
  asset_id: string;
  balance: number;
  assets: {
    symbol: string;
    price_per_token: number;
  };
}

interface DatabaseTransaction {
  amount: number;
  type: 'stake' | 'unstake';
  metadata: {
    pool_id: string;
  };
}

export const LiquidReserve: React.FC = () => {
  const { user } = useAuth();
  const [pools, setPools] = useState<Pool[]>([]);
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
  const [userBalances, setUserBalances] = useState({
    bitcoin: 0,
    honey: 0,
    bitcoinPrice: 0,
    honeyPrice: 0
  });
  const [showHoneyStakingModal, setShowHoneyStakingModal] = useState(false);
  const [showBitcoinStakingModal, setShowBitcoinStakingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [honeyAsset, setHoneyAsset] = useState<ExtendedAsset | null>(null);
  const [btcAsset, setBtcAsset] = useState<ExtendedAsset | null>(null);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [btcStakingInfo, setBtcStakingInfo] = useState<BitcoinStakingInfo | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Fetch pools data
        const { data: poolsData, error: poolsError } = await supabase
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

        if (poolsError) throw poolsError;

        // Transform pool data to match our Pool interface
        const transformedPools = (poolsData as any[]).map(pool => ({
          id: pool.id,
          type: pool.type as 'bitcoin' | 'honey',
          mainAsset: pool.main_asset,
          totalValueLocked: pool.total_value_locked,
          apr: pool.apr,
          poolAssets: pool.pool_assets
        }));

        setPools(transformedPools);

        // Fetch user staking positions and ownership data
        const [{ data: stakingData, error: stakingError }, { data: ownershipData, error: ownershipError }] = await Promise.all([
          supabase
            .from('staking_positions')
            .select(`
              id,
              pool_id,
              staked_amount,
              current_value
            `)
            .eq('user_id', user.id)
            .eq('status', 'active'),
          supabase
            .from('pool_ownership')
            .select('*')
            .eq('user_id', user.id)
        ]);

        if (stakingError) throw stakingError;
        if (ownershipError) throw ownershipError;

        // Get total staked amount for each pool
        const { data: totalStaked, error: totalStakedError } = await supabase
          .from('transactions')
          .select(`
            amount,
            type,
            metadata
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .in('type', ['stake', 'unstake']);

        if (totalStakedError) throw totalStakedError;

        // Calculate user positions with pool share and returns
        const userPositions = transformedPools.map(pool => {
          const stakingPosition = stakingData?.find(pos => pos.pool_id === pool.id);
          const ownership = ownershipData?.find(o => o.pool_id === pool.id);
          
          // Calculate total staked amount by summing stakes and subtracting unstakes
          const poolTransactions = (totalStaked as DatabaseTransaction[] || [])
            .filter(t => t.metadata?.pool_id === pool.id);
          const totalStakedAmount = poolTransactions.reduce((sum, t) => {
            return t.type === 'stake' ? sum + t.amount : sum - t.amount;
          }, 0);

          // Get ownership percentage from the pool_ownership view
          const ownershipPercentage = ownership?.ownership_percentage || 0;
          
          // Calculate current value based on ownership percentage
          const currentValue = (ownershipPercentage / 100) * pool.totalValueLocked;
          const initialStakeValue = totalStakedAmount * pool.mainAsset.price_per_token;
          const poolReturn = currentValue - initialStakeValue;

          console.log('Position calculation:', {
            poolId: pool.id,
            totalStakedAmount,
            ownershipPercentage,
            currentValue,
            initialStakeValue,
            poolReturn,
            ownershipDetails: ownership,
            poolTVL: pool.totalValueLocked
          });

          return {
            poolId: pool.id,
            balance: totalStakedAmount,
            value: currentValue,
            initialStakeValue,
            poolReturn,
            poolShare: ownershipPercentage
          };
        });

        setUserPositions(userPositions);

        // Fetch user balances and positions in a single query
        const { data: balancesData, error: balancesError } = await supabase
          .from('user_balances')
          .select(`
            asset_id,
            balance,
            assets!inner (
              symbol,
              price_per_token
            )
          `)
          .eq('user_id', user.id)
          .in('assets.symbol', ['BTC', 'HONEY', 'BTCX', 'HONEYX']);

        if (balancesError) throw balancesError;

        // Process balances
        const processedBalances = (balancesData as any[]).reduce((acc, balance) => {
          const symbol = balance.assets.symbol;
          if (symbol === 'BTC') {
            setBtcAsset({
              ...balance.assets,
              id: balance.asset_id,
              balance: balance.balance
            });
          } else if (symbol === 'HONEY') {
            setHoneyAsset({
              ...balance.assets,
              id: balance.asset_id,
              balance: balance.balance
            });
          }
          return {
            ...acc,
            [symbol]: {
              balance: balance.balance,
              value: balance.balance * balance.assets.price_per_token
            }
          };
        }, {});

        // Fetch staking info
        const honeyInfo = await transactionService.getHoneyStakingInfo(user.id);
        const btcInfo = await transactionService.getBitcoinStakingInfo(user.id);
        
        setStakingInfo(honeyInfo || null);
        setBtcStakingInfo({
          bitcoinBalance: btcInfo.bitcoinBalance,
          bitcoinXBalance: btcInfo.bitcoinXBalance,
          stakingPercentage: btcInfo.stakingPercentage
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleStakingSuccess = () => {
    // Refresh data after successful staking
    if (user) {
      const fetchData = async () => {
        const honeyInfo = await transactionService.getHoneyStakingInfo(user.id);
        const btcInfo = await transactionService.getBitcoinStakingInfo(user.id);
        
        setStakingInfo(honeyInfo || null);
        setBtcStakingInfo({
          bitcoinBalance: btcInfo.bitcoinBalance,
          bitcoinXBalance: btcInfo.bitcoinXBalance,
          stakingPercentage: btcInfo.stakingPercentage
        });
      };
      
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-light">Liquid Reserve</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pools.map(pool => (
          <div key={pool.id} className="bg-[#1A1A1A] rounded-xl border border-light/10 p-6">
            {/* Pool Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1E1E1E] flex items-center justify-center">
                  <img 
                    src={`https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/${pool.type === 'bitcoin' ? 'bitcoin' : 'honey'}.png`}
                    alt={pool.type}
                    className="w-full h-full object-cover"
                    onError={(e) => {
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
                {formatCurrency(pool.totalValueLocked)}
              </div>
            </div>

            {/* Pool Composition */}
            <div className="space-y-4 mb-6">
              <div className="text-sm text-light/60">Pool Composition</div>
              <div className="relative h-2 bg-light/10 rounded-full overflow-hidden">
                {pool.poolAssets.map((asset, index) => {
                  const percentage = (asset.balance * asset.asset.price_per_token / pool.totalValueLocked) * 100;
                  const leftOffset = index > 0 ? pool.poolAssets
                    .slice(0, index)
                    .reduce((acc, curr) => acc + (curr.balance * curr.asset.price_per_token / pool.totalValueLocked) * 100, 0) : 0;
                  return (
                    <div
                      key={asset.asset.id}
                      className={`absolute h-full ${
                        asset.asset.symbol === 'DEBT' ? 'bg-[#00D897]' : 'bg-gradient-to-r from-[#FFD700] to-[#FFA500]'
                      }`}
                      style={{
                        width: `${percentage}%`,
                        left: `${leftOffset}%`
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-sm">
                {pool.poolAssets.map(asset => (
                  <div key={asset.asset.id} className="flex items-center gap-2">
                    <span className="text-light">{asset.asset.symbol}</span>
                    <span className="text-light/60">{formatCurrency(asset.balance * asset.asset.price_per_token)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pool Position */}
            {(() => {
              const position = userPositions.find(position => position.poolId === pool.id);
              if (!position || position.balance <= 0) return null;
              
              return (
                <div className="mt-6 p-4 bg-light/5 rounded-lg">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-light/60">My Position</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-light/60">Pool Share</span>
                      <span className="text-[#00D897]">
                        {position.poolShare.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-light/60 mb-1">Staked</div>
                      <div className="text-xl font-medium text-light">
                        {formatCurrency(position.initialStakeValue)}
                      </div>
                      <div className="text-sm text-light/60">
                        {pool.type === 'bitcoin' 
                          ? position.balance.toFixed(8)
                          : position.balance.toFixed(2)
                        } {pool.mainAsset.symbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-light/60 mb-1">Position Value</div>
                      <div className="text-xl font-medium text-light">
                        {formatCurrency(position.value)}
                      </div>
                      <div className="text-sm text-light/60">
                        {pool.type === 'bitcoin'
                          ? (position.value / pool.mainAsset.price_per_token).toFixed(8)
                          : (position.value / pool.mainAsset.price_per_token).toFixed(2)
                        } {pool.mainAsset.symbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-light/60 mb-1">Pool Return</div>
                      <div className={`text-xl font-medium ${position.poolReturn >= 0 ? 'text-[#00D897]' : 'text-red-500'}`}>
                        {position.poolReturn >= 0 ? '+' : ''}{formatCurrency(position.poolReturn)}
                      </div>
                      <div className="text-sm text-light/60">
                        {position.poolReturn >= 0 ? '+' : ''}
                        {pool.type === 'bitcoin' 
                          ? ((position.value - position.initialStakeValue) / pool.mainAsset.price_per_token).toFixed(8)
                          : ((position.value - position.initialStakeValue) / pool.mainAsset.price_per_token).toFixed(2)
                        } {pool.mainAsset.symbol}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Staking Modals */}
      {stakingInfo && btcStakingInfo && honeyAsset && btcAsset && (
        <>
          <HoneyStakingModal
            isOpen={showHoneyStakingModal}
            onClose={() => setShowHoneyStakingModal(false)}
            onSuccess={handleStakingSuccess}
            honeyBalance={stakingInfo.honeyBalance}
            honeyXBalance={stakingInfo.honeyXBalance}
            stakingPercentage={stakingInfo.stakingPercentage}
            pricePerToken={honeyAsset.price_per_token}
            userId={user?.id || ''}
            honeyAsset={honeyAsset}
          />
          <BitcoinStakingModal
            isOpen={showBitcoinStakingModal}
            onClose={() => setShowBitcoinStakingModal(false)}
            onSuccess={handleStakingSuccess}
            bitcoinBalance={btcStakingInfo.bitcoinBalance}
            bitcoinXBalance={btcStakingInfo.bitcoinXBalance}
            stakingPercentage={btcStakingInfo.stakingPercentage}
            pricePerToken={btcAsset.price_per_token}
            userId={user?.id || ''}
          />
        </>
      )}
    </div>
  );
}; 