export interface NewDebtAsset {
  // Asset table fields
  name: string;
  symbol: string;
  description: string;
  main_image: string;
  price_per_token: number;
  token_supply: number;
  min_investment: number;
  max_investment: number;
  
  // Debt asset fields
  address: string;
  city: string;
  state: string;
  zip_code: string;
  loan_amount: number;
  term_months: number;
  apr: number;
  appraised_value: number;
  loan_maturity_date: Date;
  images: { url: string; description?: string }[];
  documents: { url: string; name: string; type: string }[];
}

export interface UploadedFile {
  url: string;
  name: string;
  type: string;
}

export interface AssetImage {
  url: string;
  description?: string;
} 