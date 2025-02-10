import { supabase } from '../supabase';
import { Pool, PoolBalance, StakingPosition } from '../types/pool';

export const poolService = {
  async getPool(poolId: string): Promise<Pool> {
    const { data, error } = await supabase
      .from('pools')
      .select('*')
      .eq('id', poolId)
      .single();

    if (error) throw error;
    return data;
  },

  async getPoolBalances(poolId: string): Promise<PoolBalance[]> {
    const { data, error } = await supabase
      .from('staking_positions')
      .select(`
        id,
        amount,
        asset_id,
        assets (
          id,
          symbol,
          name,
          price_per_token
        )
      `)
      .eq('pool_id', poolId);

    if (error) throw error;

    return data.map(position => ({
      id: position.id,
      balance: position.amount,
      asset: position.assets
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
    return data;
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
    // Get user's total value in pool
    const { data: userStakes } = await supabase
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

    if (!pool || !userStakes) return 0;

    const userValue = userStakes.reduce(
      (sum, stake) => sum + stake.amount * stake.assets.price_per_token,
      0
    );

    return userValue / pool.total_value_locked;
  }
}; 