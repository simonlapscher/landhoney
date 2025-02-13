import { supabase } from '../supabase';
import { Pool, PoolBalance, StakingPosition } from '../types/pool';

// Define types only for what this service needs
interface DatabaseStakingPosition {
  id: string;
  user_id: string;
  pool_id: string;
  amount: number;
  asset_id: string;
  created_at: string;
  updated_at: string;
  assets?: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
  };
  pool?: Pool;
}

export const poolService = {
  async getPool(poolId: string): Promise<Pool> {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (error) throw error;
    return data as unknown as Pool;
  },

  async getPoolBalances(poolId: string): Promise<PoolBalance[]> {
    const { data, error } = await supabase
      .from('staking_positions')
      .select(`
        id,
        pool_id,
        amount,
        asset_id,
        created_at,
        updated_at,
        assets (
          id,
          symbol,
          name,
          price_per_token
        )
      `)
      .eq('pool_id', poolId);

    if (error) throw error;

    // Type assertion and transformation
    const positions = data as unknown as DatabaseStakingPosition[];
    
    return positions
      .filter(position => position.assets) // Filter out positions without assets
      .map(position => ({
        id: position.id,
        poolId: position.pool_id,
        assetId: position.asset_id,
        balance: position.amount,
        createdAt: position.created_at,
        updatedAt: position.updated_at
      }));
  },

  async getUserStakingPositions(userId: string): Promise<StakingPosition[]> {
    const { data, error } = await supabase
      .from('staking_positions')
      .select(`
        *,
        pool:pools (*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    
    // Type assertion and transformation
    const positions = data as unknown as DatabaseStakingPosition[];
    return positions
      .filter(pos => pos.pool) // Filter out positions without pool data
      .map(pos => ({
        id: pos.id,
        userId: pos.user_id,
        poolId: pos.pool_id,
        stakedAmount: pos.amount,
        currentValue: pos.amount, // This should be calculated based on current asset price
        stakeTimestamp: pos.created_at,
        unstakedAt: null,
        status: 'active',
        createdAt: pos.created_at,
        updatedAt: pos.updated_at
      }));
  },

  async calculateUserPoolShare(stakingPositionId: string): Promise<number> {
    const { data, error } = await supabase
      .rpc('calculate_pool_share', {
        p_stake_position_id: stakingPositionId
      });

    if (error) throw error;
    return data;
  },

  async getUserPoolShare(poolId: string, userId: string): Promise<number> {
    interface StakeWithAsset {
      amount: number;
      assets: {
        price_per_token: number;
      };
    }

    // Get user's total value in pool
    const { data: rawUserStakes } = await supabase
      .from('staking_positions')
      .select(`
        amount,
        assets (price_per_token)
      `)
      .eq('pool_id', poolId)
      .eq('user_id', userId);

    // Get pool's total value
    const { data: pool } = await supabase
      .from('pools')
      .select('total_value_locked')
      .eq('id', poolId)
      .single();

    if (!pool || !rawUserStakes) return 0;

    const userStakes = rawUserStakes as unknown as StakeWithAsset[];
    const userValue = userStakes.reduce(
      (sum, stake) => sum + stake.amount * stake.assets.price_per_token,
      0
    );

    return userValue / pool.total_value_locked;
  }
}; 