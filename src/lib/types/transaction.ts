export type TransactionType = 'buy' | 'sell' | 'convert' | 'earn' | 'stake' | 'unstake';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type PaymentMethod = 'USD' | 'USDC';

export interface TransactionMetadata {
  payment_method: PaymentMethod;
  fee_usd: number;
  reference: string;
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