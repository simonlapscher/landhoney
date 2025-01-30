export interface Asset {
  id: string;
  created_at: string;
  updated_at: string;
}

interface DebtAssetDetails {
  id: string;
  apr: number;
  term_months: number;
  loan_amount: number;
  appraised_value: number;
}

export interface PortfolioAsset extends Asset {
  type: 'debt' | 'commodity';
  name: string;
  symbol: string;
  main_image: string;
  price_per_token: number;
  location?: string;
  ltv?: number;
  term?: string;
  term_months?: number;
  loan_amount?: number;
  appraised_value?: number;
  funded_amount?: number;
  max_investment?: number;
  apr?: number;
  debt_assets?: DebtAssetDetails[];
}

export interface DebtAsset extends PortfolioAsset {
  type: 'debt';
  location: string;
  ltv: number;
  term: string;
  term_months: number;
  loan_amount: number;
  appraised_value: number;
  funded_amount: number;
  max_investment: number;
  apr: number;
}

export interface CommodityAsset extends PortfolioAsset {
  type: 'commodity';
} 
