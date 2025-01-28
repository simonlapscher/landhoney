export interface BaseAsset {
  id: string;
  name: string;
  type: 'debt' | 'commodity';
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
}

export interface AssetPrice {
  price: number;
  timestamp: string;
}

export interface CommodityAsset extends BaseAsset {
  type: 'commodity';
  asset_prices: AssetPrice[];
}

export type Asset = DebtAsset | CommodityAsset; 