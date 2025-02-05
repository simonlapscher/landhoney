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
    assetId: string,
    amountUsd: number,
    amountTokens: number,
    feeUsd: number,
    paymentMethod: PaymentMethod,
    pricePerToken: number,
    transactionType: 'buy' | 'sell' = 'buy'
  ): Promise<Transaction> {
    try {
      console.log('Starting transaction creation with:', {
        assetId,
        amountTokens,
        pricePerToken,
        paymentMethod,
        transactionType
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

      // Get profile using email to ensure correct user context
      const { data: profile, error: profileError } = await supabase.rpc(
        'get_profile_by_email',
        { p_email: session.user.email }
      );

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw new TransactionError(
          'Profile error',
          'PROFILE_ERROR',
          'Failed to verify user profile'
        );
      }

      if (!profile) {
        console.error('No profile found for email:', session.user.email);
        throw new TransactionError(
          'Profile error',
          'PROFILE_ERROR',
          'User profile not found'
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

      const metadata: TransactionMetadata = {
        payment_method: paymentMethod,
        fee_usd: feeUsd,
        reference: `${Date.now()}`
      };
      
      console.log('Attempting to create transaction with data:', {
        user_id: profile.user_id,
        asset_id: assetId,
        type: transactionType,
        amount: amountTokens,
        price_per_token: pricePerToken,
        status: 'pending'
      });

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.user_id,
          asset_id: assetId,
          type: transactionType,
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
        console.error('Transaction creation error:', error);
        throw new TransactionError(
          'Failed to create transaction',
          'TRANSACTION_ERROR',
          error.message
        );
      }

      return data;
    } catch (error) {
      console.error('Error in createTransaction:', error);
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        'Failed to create transaction',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    try {
      console.log('Fetching user transactions for ID:', userId);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          asset:assets (
            id,
            name,
            symbol,
            type,
            price_per_token,
            main_image,
            debt_assets (
              id,
              apr,
              term_months,
              loan_amount,
              appraised_value
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user transactions:', error);
        throw new TransactionError(
          'Failed to fetch transactions',
          'FETCH_ERROR',
          error.message
        );
      }

      console.log('Raw transaction response:', {
        count: data?.length || 0,
        transactions: data?.map(t => ({
          id: t.id,
          status: t.status,
          type: t.type,
          amount: t.amount,
          created_at: t.created_at,
          asset: {
            symbol: t.asset?.symbol,
            name: t.asset?.name
          }
        }))
      });

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
              appraised_value,
              city,
              state
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

      console.log('Raw response from getUserBalances:', JSON.stringify(data, null, 2));

      if (!data || data.length === 0) {
        console.log('No balances found in database for user:', userId);
      } else {
        console.log('Found balances:', data.length, 'records');
        console.log('Balance records:', data);
      }

      return data || [];
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

  async stakeHoney(userId: string, amount: number): Promise<Transaction> {
    try {
      console.log('Starting Honey staking transaction:', { userId, amount });

      // Get the Honey asset
      const { data: honeyAsset, error: honeyError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'HONEY')
        .single();

      if (honeyError || !honeyAsset) {
        console.error('Error fetching Honey asset:', honeyError);
        throw new TransactionError(
          'Failed to fetch Honey asset',
          'ASSET_ERROR',
          honeyError?.message
        );
      }

      // Get the HoneyX asset
      const { data: honeyXAsset, error: honeyXError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'HONEYX')
        .single();

      if (honeyXError || !honeyXAsset) {
        console.error('Error fetching HoneyX asset:', honeyXError);
        throw new TransactionError(
          'Failed to fetch HoneyX asset',
          'ASSET_ERROR',
          honeyXError?.message
        );
      }

      // Call the stake_honey function
      const { data: transaction, error: transactionError } = await supabase.rpc(
        'stake_honey',
        {
          p_user_id: userId,
          p_amount: amount,
          p_honey_id: honeyAsset.id,
          p_honeyx_id: honeyXAsset.id,
          p_price_per_token: honeyAsset.price_per_token
        }
      );

      if (transactionError) {
        console.error('Error in stake transaction:', transactionError);
        throw new TransactionError(
          'Failed to process stake transaction',
          'TRANSACTION_ERROR',
          transactionError.message
        );
      }

      return transaction;
    } catch (error) {
      console.error('Error in stakeHoney:', error);
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        'Failed to stake Honey',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async unstakeHoney(userId: string, amount: number): Promise<Transaction> {
    try {
      console.log('Starting Honey unstaking transaction:', { userId, amount });

      // Get the Honey asset
      const { data: honeyAsset, error: honeyError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'HONEY')
        .single();

      if (honeyError || !honeyAsset) {
        console.error('Error fetching Honey asset:', honeyError);
        throw new TransactionError(
          'Failed to fetch Honey asset',
          'ASSET_ERROR',
          honeyError?.message
        );
      }

      // Get the HoneyX asset
      const { data: honeyXAsset, error: honeyXError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'HONEYX')
        .single();

      if (honeyXError || !honeyXAsset) {
        console.error('Error fetching HoneyX asset:', honeyXError);
        throw new TransactionError(
          'Failed to fetch HoneyX asset',
          'ASSET_ERROR',
          honeyXError?.message
        );
      }

      // Call the unstake_honey function
      const { data: transaction, error: transactionError } = await supabase.rpc(
        'unstake_honey',
        {
          p_user_id: userId,
          p_amount: amount,
          p_honey_id: honeyAsset.id,
          p_honeyx_id: honeyXAsset.id,
          p_price_per_token: honeyAsset.price_per_token
        }
      );

      if (transactionError) {
        console.error('Error in unstake transaction:', transactionError);
        throw new TransactionError(
          'Failed to process unstake transaction',
          'TRANSACTION_ERROR',
          transactionError.message
        );
      }

      return transaction;
    } catch (error) {
      console.error('Error in unstakeHoney:', error);
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        'Failed to unstake Honey',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async getHoneyStakingInfo(userId: string): Promise<{ 
    honeyBalance: number, 
    honeyXBalance: number, 
    stakingPercentage: number 
  }> {
    try {
      console.log('Fetching Honey staking info for user:', userId);

      interface AssetBalance {
        balance: number;
        asset: {
          symbol: string;
        };
      }

      const { data: balances, error: balancesError } = await supabase
        .from('user_balances')
        .select(`
          balance,
          asset:assets (
            symbol
          )
        `)
        .eq('user_id', userId)
        .in('asset.symbol', ['HONEY', 'HONEYX']) as { 
          data: AssetBalance[] | null, 
          error: any 
        };

      if (balancesError) {
        console.error('Error fetching Honey balances:', balancesError);
        throw new TransactionError(
          'Failed to fetch Honey balances',
          'BALANCE_ERROR',
          balancesError.message
        );
      }

      // If no balances found, return zero values
      if (!balances || balances.length === 0) {
        console.log('No Honey balances found for user:', userId);
        return {
          honeyBalance: 0,
          honeyXBalance: 0,
          stakingPercentage: 0
        };
      }

      const honeyBalance = balances.find(b => b?.asset?.symbol === 'HONEY')?.balance || 0;
      const honeyXBalance = balances.find(b => b?.asset?.symbol === 'HONEYX')?.balance || 0;
      const stakingPercentage = honeyXBalance > 0 
        ? (honeyXBalance / (honeyBalance + honeyXBalance)) * 100 
        : 0;

      console.log('Found Honey balances:', {
        honeyBalance,
        honeyXBalance,
        stakingPercentage
      });

      return {
        honeyBalance: Number(honeyBalance),
        honeyXBalance: Number(honeyXBalance),
        stakingPercentage
      };
    } catch (error) {
      console.error('Error in getHoneyStakingInfo:', error);
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        'Failed to fetch Honey staking info',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async stakeBitcoin(userId: string, amount: number): Promise<Transaction> {
    try {
      // Get the BTC asset
      const { data: btcAsset, error: btcError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'BTC')
        .single();

      if (btcError || !btcAsset) {
        throw new TransactionError(
          'Failed to fetch BTC asset',
          'ASSET_ERROR',
          btcError?.message
        );
      }

      // Get the BTCX asset
      const { data: btcxAsset, error: btcxError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'BTCX')
        .single();

      if (btcxError || !btcxAsset) {
        throw new TransactionError(
          'Failed to fetch BTCX asset',
          'ASSET_ERROR',
          btcxError?.message
        );
      }

      const { data: transaction, error: transactionError } = await supabase.rpc(
        'stake_bitcoin',
        {
          p_user_id: userId,
          p_amount: amount,
          p_btc_asset_id: btcAsset.id,
          p_btcx_asset_id: btcxAsset.id,
          p_price_per_token: btcAsset.price_per_token
        }
      );

      if (transactionError) throw transactionError;
      return transaction;
    } catch (error) {
      console.error('Error in stakeBitcoin:', error);
      if (error instanceof TransactionError) throw error;
      throw new TransactionError(
        'Failed to stake Bitcoin',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async unstakeBitcoin(userId: string, amount: number): Promise<Transaction> {
    try {
      // Get the BTC asset
      const { data: btcAsset, error: btcError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'BTC')
        .single();

      if (btcError || !btcAsset) {
        throw new TransactionError(
          'Failed to fetch BTC asset',
          'ASSET_ERROR',
          btcError?.message
        );
      }

      // Get the BTCX asset
      const { data: btcxAsset, error: btcxError } = await supabase
        .from('assets')
        .select('*')
        .eq('symbol', 'BTCX')
        .single();

      if (btcxError || !btcxAsset) {
        throw new TransactionError(
          'Failed to fetch BTCX asset',
          'ASSET_ERROR',
          btcxError?.message
        );
      }

      const { data: transaction, error: transactionError } = await supabase.rpc(
        'unstake_bitcoin',
        {
          p_user_id: userId,
          p_amount: amount,
          p_btc_asset_id: btcAsset.id,
          p_btcx_asset_id: btcxAsset.id,
          p_price_per_token: btcAsset.price_per_token
        }
      );

      if (transactionError) throw transactionError;
      return transaction;
    } catch (error) {
      console.error('Error in unstakeBitcoin:', error);
      if (error instanceof TransactionError) throw error;
      throw new TransactionError(
        'Failed to unstake Bitcoin',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  },

  async getBitcoinStakingInfo(userId: string): Promise<{ 
    bitcoinBalance: number, 
    bitcoinXBalance: number, 
    stakingPercentage: number 
  }> {
    try {
      console.log('Fetching Bitcoin staking info for user:', userId);

      interface AssetBalance {
        balance: number;
        asset: {
          symbol: string;
        };
      }

      const { data: balances, error: balancesError } = await supabase
        .from('user_balances')
        .select(`
          balance,
          asset:assets (
            symbol
          )
        `)
        .eq('user_id', userId)
        .in('asset.symbol', ['BTC', 'BTCX']) as { 
          data: AssetBalance[] | null, 
          error: any 
        };

      if (balancesError) {
        console.error('Error fetching Bitcoin balances:', balancesError);
        throw new TransactionError(
          'Failed to fetch Bitcoin balances',
          'BALANCE_ERROR',
          balancesError.message
        );
      }

      // If no balances found, return zero values
      if (!balances || balances.length === 0) {
        console.log('No Bitcoin balances found for user:', userId);
        return {
          bitcoinBalance: 0,
          bitcoinXBalance: 0,
          stakingPercentage: 0
        };
      }

      const bitcoinBalance = balances.find(b => b?.asset?.symbol === 'BTC')?.balance || 0;
      const bitcoinXBalance = balances.find(b => b?.asset?.symbol === 'BTCX')?.balance || 0;
      const stakingPercentage = bitcoinXBalance > 0 
        ? (bitcoinXBalance / (bitcoinBalance + bitcoinXBalance)) * 100 
        : 0;

      console.log('Found Bitcoin balances:', {
        bitcoinBalance,
        bitcoinXBalance,
        stakingPercentage
      });

      return {
        bitcoinBalance: Number(bitcoinBalance),
        bitcoinXBalance: Number(bitcoinXBalance),
        stakingPercentage
      };
    } catch (error) {
      console.error('Error in getBitcoinStakingInfo:', error);
      if (error instanceof TransactionError) {
        throw error;
      }
      throw new TransactionError(
        'Failed to fetch Bitcoin staking info',
        'UNKNOWN_ERROR',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}; 