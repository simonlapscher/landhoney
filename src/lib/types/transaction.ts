export type TransactionType = 'buy' | 'sell' | 'convert' | 'earn' | 'stake' | 'unstake' | 'loan_distribution';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'usd_balance' | 'bank_account' | 'usdc';

export interface TransactionMetadata {
  payment_method?: PaymentMethod;
  fee_usd?: number;
  reference?: string;
  // Loan distribution specific fields
  distribution_id?: string;
  distribution_type?: string;
  debt_asset_name?: string;
  debt_asset_symbol?: string;
  source_asset_id?: string;
  source_asset_main_image?: string;
  days_held?: number;
  usd_amount?: number;
  interest_for_period?: number;
  total_dollar_days?: number;
  user_owned_fraction?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  asset_id: string;
  type: TransactionType;
  amount: number;
  price_per_token: number;
  status: TransactionStatus;
  completed_at?: string;
  cancelled_at?: string;
  metadata?: TransactionMetadata;
  created_at: string;
  updated_at: string;
} 