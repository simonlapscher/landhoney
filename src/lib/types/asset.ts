export interface BaseAsset {
  id: string;
  name: string;
  type: 'debt' | 'commodity' | 'cash';
  main_image: string;
  description: string;
  created_at: string;
  updated_at: string;
  symbol: string;
  price_per_token: number;
  decimals: number;
  token_supply: number;
  min_investment: number;
  max_investment: number;
}

export interface DebtAsset extends BaseAsset {
  type: 'debt';
  location: string;
  apr: number;
  ltv: number;
  term: string;
  term_months: number;
  loan_amount: number;
  appraised_value: number;
  funded_amount: number;
  remaining_amount: number;
  images?: string[];
  total_supply: number;
  available_supply: number;
}

export interface CommodityAsset extends BaseAsset {
  type: 'commodity';
  asset_prices: AssetPrice[];
}

export interface CashAsset extends BaseAsset {
  type: 'cash';
}

export interface AssetPrice {
  price: number;
  timestamp: string;
}

export interface ExtendedAsset {
  id: string;
  symbol: string;
  name: string;
  type: string;
  price_per_token: number;
  created_at: string;
  updated_at: string;
  main_image: string;
}

export interface SimpleAsset {
  id: string;
  symbol: string;
  name: string;
  price_per_token: number;
  type: 'debt' | 'commodity' | 'cash';
}

export interface PoolBalance {
  id: string;
  balance: number;
  asset: SimpleAsset;
  assetId: string;
}

export interface BitcoinStakingInfo {
  bitcoinBalance: number;
  btcXBalance: number;
  stakingPercentage: number;
}

// This is our main Asset type
export type Asset = DebtAsset | CommodityAsset | CashAsset;

export interface AssetBalance {
  id: string;
  user_id: string;
  asset_id: string;
  asset: DebtAsset;
  balance: number;
  total_interest_earned: number;
  last_transaction_at?: string;
  created_at: string;
  updated_at: string;
} 