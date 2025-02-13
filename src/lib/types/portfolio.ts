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