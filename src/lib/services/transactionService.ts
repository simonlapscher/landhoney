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
      console.log('Starting transaction creation with:', {
        userId,
        assetId,
        amountTokens,
        pricePerToken,
        paymentMethod
      });

      // First verify the session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw new TransactionError(
          'Authentication error',
          'AUTH_ERROR',
          'Please sign in again'
        );
      }
      
      if (!session) {
        console.error('No active session found');
        throw new TransactionError(
          'No active session',
          'AUTH_ERROR',
          'Please sign in again'
        );
      }

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
      const { data: userExists, error: userError } = await supabase.rpc('get_user_profile', {
        p_user_id: userId
      });

      if (userError) {
        console.error('User verification error:', userError);
        throw new TransactionError(
          'User verification failed',
          'USER_ERROR',
          userError.message
        );
      }

      if (!userExists) {
        console.error('No profile found for user:', userId);
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
      
      console.log('Attempting to create transaction with data:', {
        user_id: userId,
        asset_id: assetId,
        type: 'buy',
        amount: amountTokens,
        price_per_token: pricePerToken,
        status: 'pending'
      });

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          asset_id: assetId,
          type: 'buy',
          amount: amountTokens,
          price_per_token: pricePerToken,
          metadata,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Transaction creation error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
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
          case '42501': // Permission denied
            throw new TransactionError(
              'Permission denied',
              'PERMISSION_ERROR',
              'You do not have permission to create transactions'
            );
          default:
            throw new TransactionError(
              'Failed to create transaction',
              'CREATE_ERROR',
              `${error.message} (Code: ${error.code})`
            );
        }
      }

      console.log('Transaction created successfully:', data);
      return data;
    } catch (error) {
      console.error('Full error details:', error);
      
      if (error instanceof TransactionError) throw error;
      
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
      console.log('Getting balances for user ID:', userId);
      
      // Log the query we're about to execute
      console.log('Executing query on user_balances table with user_id:', userId);
      
      const { data, error } = await supabase
        .from('user_balances')
        .select(`
          *,
          asset:assets(
            *,
            debt_assets(
              id,
              apr,
              term_months,
              loan_amount,
              appraised_value
            )
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.error('Database error when fetching balances:', error);
        throw new TransactionError(
          'Failed to fetch balances',
          'FETCH_ERROR',
          error.message
        );
      }

      if (!data || data.length === 0) {
        console.log('No balances found in database for user:', userId);
      } else {
        console.log('Found balances:', data.length, 'records');
        console.log('Balance records:', data);
      }

      return data || [];
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
      console.log('Getting balance for user ID:', userId, 'and asset ID:', assetId);
      
      // Log the query we're about to execute
      console.log('Executing query on user_balances table with filters:', {
        user_id: userId,
        asset_id: assetId
      });
      
      const { data, error } = await supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', userId)
        .eq('asset_id', assetId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No balance record found in database for user:', userId, 'and asset:', assetId);
          return 0;
        }
        console.error('Database error when fetching balance:', error);
        throw new TransactionError(
          'Failed to fetch balance',
          'FETCH_ERROR',
          error.message
        );
      }

      if (!data) {
        console.log('No balance data returned (but no error) for user:', userId, 'and asset:', assetId);
        return 0;
      }

      console.log('Found balance record:', data);
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
}; 