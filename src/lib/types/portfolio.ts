export interface Asset {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface ExtendedAsset extends Asset {
  type: 'debt' | 'commodity' | 'cash';
  name: string;
  symbol: string;
  main_image: string;
  price_per_token: number;
  location?: string;
  apr?: number;
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
  asset: ExtendedAsset;
}

export interface SimpleAsset {
  id: string;
  symbol: string;
  name: string;
  price_per_token: number;
  type: 'debt' | 'commodity' | 'cash';
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

export interface DebtAsset extends ExtendedAsset {
  debt_assets?: Array<{
    apr: number;
    city: string;
    state: string;
  }>;
} 