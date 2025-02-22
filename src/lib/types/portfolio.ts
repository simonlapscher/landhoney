import { SimpleAsset } from './asset';

export type FilterType = 'all' | 'debt' | 'commodity' | 'cash';

export interface Transaction {
  id: string;
  user_id: string;
  asset_id: string;
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'loan_distribution' | 'earn';
  amount: number;
  price_per_token: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  metadata?: Record<string, any>;
  asset: SimpleAsset;
}

export interface PortfolioBalance {
  id: string;
  user_id: string;
  asset_id: string;
  balance: number;
  total_value: number;
  total_interest_earned: number;
  created_at: string;
  updated_at: string;
  last_transaction_at: string | null;
  asset: SimpleAsset;
}

export interface StakingInfo {
  honeyBalance: number;
  honeyXBalance: number;
  stakingPercentage: number;
}

export interface BitcoinStakingInfo {
  bitcoinBalance: number;
  bitcoinXBalance: number;
  stakingPercentage: number;
}

export interface DatabaseAsset {
  id: string;
  symbol: string;
  name: string;
  price_per_token: number;
}

export interface DatabaseBalance {
  asset_id: string;
  balance: number;
  assets: {
    symbol: string;
    price_per_token: number;
  };
}

export interface DatabasePool {
  id: string;
  type: string;
  total_value_locked: number;
  apr: number;
  main_asset: DatabaseAsset;
  pool_assets: Array<{
    balance: number;
    asset: DatabaseAsset;
  }>;
}

export interface StakingPositionWithPool {
  id: string;
  amount: number;
  ownership_percentage: number;
  pool: {
    id: string;
    type: string;
    total_value_locked: number;
    main_asset: {
      price_per_token: number;
    };
  };
} 