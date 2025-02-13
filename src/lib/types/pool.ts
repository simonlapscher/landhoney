export type PoolType = 'bitcoin' | 'honey';

export interface Pool {
  id: string;
  type: PoolType;
  mainAssetId: string;
  apr: number;
  maxSize: number;
  isPaused: boolean;
  totalValueLocked: number;
  createdAt: string;
  updatedAt: string;
  main_asset?: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
  };
  pool_assets?: Array<{
    balance: number;
    asset: {
      id: string;
      symbol: string;
      name: string;
      price_per_token: number;
    };
  }>;
}

export interface PoolBalance {
  id: string;
  poolId: string;
  assetId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
  asset: {
    id: string;
    symbol: string;
    name: string;
    price_per_token: number;
  };
}

export interface StakingPosition {
  id: string;
  userId: string;
  poolId: string;
  stakedAmount: number;
  currentValue: number;
  stakeTimestamp: string;
  unstakedAt: string | null;
  status: 'active' | 'unstaked';
  createdAt: string;
  updatedAt: string;
} 