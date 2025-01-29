import { supabase } from '../supabase';
import { Transaction, TransactionMetadata, PaymentMethod } from '../types/transaction';
import { DebtAsset, AssetBalance } from '../types/asset';

export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

export const transactionService = {
  async verifyAsset(assetId: string): Promise<boolean> {
    console.log('Verifying asset with ID:', assetId);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId)
        .maybeSingle();

      if (error) {
        console.error('Asset verification error:', error);
        throw new TransactionError(
          'Failed to verify asset',
          'ASSET_VERIFICATION_ERROR',
          `Error: ${error.message}, Code: ${error.code}`
        );
      }

      console.log('Asset verification result:', data);
      return data !== null;
    } catch (error) {
      console.error('Asset verification error:', error);
      return false;
    }
  },

  async createTransaction(
    userId: string,
    assetId: string,
    amountUsd: number,
    amountTokens: number,
    feeUsd: number,
    paymentMethod: PaymentMethod,
    pricePerToken: number
  ): Promise<Transaction> {
    try {
      // Verify asset exists
      const assetExists = await this.verifyAsset(assetId);
      if (!assetExists) {
        console.error('Asset verification failed for ID:', assetId);
        throw new TransactionError(
          'Asset not found',
          'ASSET_NOT_FOUND',
          `Asset with ID ${assetId} does not exist`
        );
      }

      // Verify user exists (this should be handled by RLS, but double-check)
      const { data: userExists, error: userError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (userError || !userExists) {
        throw new TransactionError(
          'User not found',
          'USER_NOT_FOUND',
          'Please complete your profile before investing'
        );
      }

      const metadata: TransactionMetadata = {
        payment_method: paymentMethod,
        fee_usd: feeUsd,
        reference: `${Date.now()}`
      };
      
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          asset_id: assetId,
          type: 'buy',
          amount: amountTokens,
          price_per_token: pricePerToken,
          metadata,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        // Handle specific database errors
        switch (error.code) {
          case '23503': // Foreign key violation
            throw new TransactionError(
              'Invalid reference',
              'INVALID_REFERENCE',
              'The asset or user reference is invalid'
            );
          case '23514': // Check violation
            throw new TransactionError(
              'Invalid transaction data',
              'INVALID_DATA',
              'The transaction amount or price must be greater than 0'
            );
          default:
            throw new TransactionError(
              'Failed to create transaction',
              'CREATE_ERROR',
              error.message
            );
        }
      }

      return data;
    } catch (error) {
      if (error instanceof TransactionError) throw error;
      
      console.error('Unexpected error in createTransaction:', error);
      throw new TransactionError(
        'Failed to create transaction',
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new TransactionError(
          'Failed to fetch transactions',
          'FETCH_ERROR',
          error.message
        );
      }

      return data;
    } catch (error) {
      console.error('Error in getUserTransactions:', error);
      throw new TransactionError(
        'Failed to fetch transactions',
        'FETCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async getUserBalances(userId: string): Promise<AssetBalance[]> {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select(`
          *,
          asset:assets(*)
        `)
        .eq('user_id', userId);

      if (error) {
        throw new TransactionError(
          'Failed to fetch balances',
          'FETCH_ERROR',
          error.message
        );
      }

      return data;
    } catch (error) {
      console.error('Error in getUserBalances:', error);
      throw new TransactionError(
        'Failed to fetch balances',
        'FETCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async getUserBalance(userId: string, assetId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('asset_id', assetId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return 0; // No balance found
        throw new TransactionError(
          'Failed to fetch balance',
          'FETCH_ERROR',
          error.message
        );
      }

      return data.balance;
    } catch (error) {
      if (error instanceof TransactionError) throw error;
      
      console.error('Error in getUserBalance:', error);
      throw new TransactionError(
        'Failed to fetch balance',
        'FETCH_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  // For development: Auto-approve transactions after 2 minutes
  async setupAutoApproval(transactionId: string): Promise<void> {
    setTimeout(async () => {
      try {
        // Fetch the transaction
        const { data: tx, error: fetchError } = await supabase
          .from('transactions')
          .select()
          .eq('id', transactionId)
          .single();

        if (fetchError) {
          throw new TransactionError(
            'Failed to fetch transaction',
            'FETCH_ERROR',
            fetchError.message
          );
        }

        if (!tx) {
          throw new TransactionError(
            'Transaction not found',
            'NOT_FOUND',
            `Transaction with ID ${transactionId} does not exist`
          );
        }

        if (tx.status !== 'pending') {
          console.log('Transaction no longer pending, skipping auto-approval');
          return;
        }

        // Update transaction status
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', transactionId);

        if (updateError) {
          throw new TransactionError(
            'Failed to update transaction',
            'UPDATE_ERROR',
            updateError.message
          );
        }

        // Update user balance
        const { error: balanceError } = await supabase
          .from('user_balances')
          .upsert({
            user_id: tx.user_id,
            asset_id: tx.asset_id,
            balance: tx.amount,
            last_transaction_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,asset_id',
            ignoreDuplicates: false
          });

        if (balanceError) {
          throw new TransactionError(
            'Failed to update balance',
            'BALANCE_UPDATE_ERROR',
            balanceError.message
          );
        }
      } catch (error) {
        console.error('Error in auto-approval process:', error);
        // We don't throw here since this is in a setTimeout
        // Instead, we could implement a retry mechanism or notification system
      }
    }, 120000); // 2 minutes
  }
}; 