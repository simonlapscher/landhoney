import { supabase, adminSupabase } from '../supabase';
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

interface ApproveSellTransactionParams {
  transactionId: string;
  poolId: string | null;
  pricePerToken: number;
  poolReduction: number;
  userTokens: number;
  poolMainAssetPrice?: number;
}

interface CreateBuyTransactionParams {
  userId: string;
  assetId: string;
  amount: number;
  pricePerToken: number;
  paymentMethod: 'usd_balance' | 'bank_account' | 'usdc';
}

interface ApproveBuyTransactionParams {
  transactionId: string;
  poolId: string | null;
  pricePerToken: number;
  paymentAmount: number;
  poolMainAssetPrice?: number;
}

interface CreateSellTransactionParams {
  userId: string;
  assetId: string;
  amount: number;
  pricePerToken: number;
}

interface ApproveDepositWithdrawalParams {
  transactionId: string;
  pricePerToken: number;
  amount: number;
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
              duration_months,
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
              duration_months,
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
  },

  async depositCash(userId: string, amount: number): Promise<Transaction> {
    const { data: usdAsset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', 'USD')
      .single();

    if (assetError) throw assetError;

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        asset_id: usdAsset.id,
        type: 'deposit',
        amount: amount,
        price_per_token: 1, // USD is always 1:1
        status: 'pending',
        metadata: {}
      })
      .select()
      .single();

    if (error) throw error;
    return transaction;
  },

  async withdrawCash(userId: string, amount: number): Promise<Transaction> {
    const { data: usdAsset, error: assetError } = await supabase
      .from('assets')
      .select('*')
      .eq('symbol', 'USD')
      .single();

    if (assetError) throw assetError;

    // Check if user has enough balance
    const { data: balance, error: balanceError } = await supabase
      .from('user_balances')
      .select('balance')
      .eq('user_id', userId)
      .eq('asset_id', usdAsset.id)
      .single();

    if (balanceError) throw balanceError;
    if (!balance || balance.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        asset_id: usdAsset.id,
        type: 'withdraw',
        amount: amount,
        price_per_token: 1,
        status: 'pending',
        metadata: {}
      })
      .select()
      .single();

    if (error) throw error;
    return transaction;
  },

  async createUsdBalanceOrder({
    userId,
    assetId,
    amount,
    totalToPay,
    fee
  }: {
    userId: string;
    assetId: string;
    amount: number;
    totalToPay: number;
    fee: number;
  }) {
    const { data, error } = await supabase.rpc('create_usd_balance_order', {
      p_user_id: userId,
      p_asset_id: assetId,
      p_amount: amount,
      p_total_to_pay: totalToPay,
      p_fee: fee
    });

    if (error) throw error;
    return data;
  },

  async approveUsdBalanceOrder(orderId: string) {
    const { data, error } = await supabase.rpc('approve_usd_balance_order', {
      p_transaction_id: orderId
    });

    if (error) {
      console.error('Error approving USD balance order:', error);
      throw error;
    }

    return data;
  },

  async approveSellTransaction({
    transactionId,
    poolId,
    pricePerToken,
    poolReduction,
    userTokens,
    poolMainAssetPrice
  }: ApproveSellTransactionParams) {
    try {
      console.log('Calling process_sell_transaction with params:', {
        p_transaction_id: transactionId,
        p_pool_id: poolId || '00000000-0000-0000-0000-000000000000',
        p_price_per_token: pricePerToken,
        p_pool_reduction: poolReduction,
        p_user_tokens: userTokens,
        p_usd_value: userTokens * pricePerToken
      });

      const { data, error } = await adminSupabase.rpc('process_sell_transaction', {
        p_transaction_id: transactionId,
        p_pool_id: poolId || '00000000-0000-0000-0000-000000000000',
        p_price_per_token: pricePerToken,
        p_pool_reduction: poolReduction,
        p_user_tokens: userTokens,
        p_usd_value: userTokens * pricePerToken
      });

      if (error) {
        console.error('Detailed error from process_sell_transaction:', error);
        throw new Error(`Failed to approve sell transaction: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Error in approveSellTransaction:', err);
      throw err;
    }
  },

  async approveBuyTransaction({
    transactionId,
    poolId,
    pricePerToken,
    paymentAmount,
    poolMainAssetPrice
  }: ApproveBuyTransactionParams) {
    console.log('Starting approveBuyTransaction:', {
      transactionId,
      poolId,
      pricePerToken,
      paymentAmount,
      poolMainAssetPrice
    });

    try {
      // First, directly check transaction status and get asset info
      const { data: currentTransaction, error: checkError } = await supabase
        .from('transactions')
        .select(`
          *,
          asset:assets (
            id,
            symbol,
            type
          )
        `)
        .eq('id', transactionId)
        .single();

      console.log('Direct transaction check:', {
        found: !!currentTransaction,
        error: checkError,
        status: currentTransaction?.status,
        metadata: currentTransaction?.metadata,
        assetType: currentTransaction?.asset?.type,
        assetSymbol: currentTransaction?.asset?.symbol
      });

      if (checkError || !currentTransaction) {
        throw new TransactionError(
          'Transaction not found',
          'NOT_FOUND_ERROR'
        );
      }

      // Update transaction metadata with USD amount
      const { error: updateError } = await adminSupabase
        .from('transactions')
        .update({
          metadata: {
            ...currentTransaction.metadata,
            usd_amount: paymentAmount
          }
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating transaction metadata:', updateError);
        throw new TransactionError(
          'Failed to update transaction metadata',
          'UPDATE_ERROR'
        );
      }

      // Handle direct asset transactions (BTC/HONEY) differently from pool-based transactions
      const isDirectAsset = currentTransaction.asset?.symbol === 'BTC' || currentTransaction.asset?.symbol === 'HONEY';
      
      if (isDirectAsset) {
        // For direct assets, use approve_direct_asset_order
        const { data, error } = await supabase.rpc('approve_direct_asset_order', {
          p_transaction_id: transactionId,
          p_price_per_token: pricePerToken
        });

        console.log('Direct asset order approval result:', {
          success: !!data,
          error,
          response: data
        });

        if (error) {
          console.error('Error in approve_direct_asset_order:', error);
          throw new TransactionError(
            error.message,
            error.code,
            error.details
          );
        }

        return data;
      } else {
        // For pool-based transactions, use existing approve_usd_balance_order
        if (!poolMainAssetPrice) {
          throw new TransactionError(
            'Pool main asset price is required for pool transactions',
            'VALIDATION_ERROR'
          );
        }

        const { data, error } = await supabase.rpc('approve_usd_balance_order', {
          p_transaction_id: transactionId,
          p_price_per_token: pricePerToken,
          p_pool_main_asset_price: poolMainAssetPrice
        });

        console.log('Pool-based order approval result:', {
          success: !!data,
          error,
          response: data
        });

        if (error) {
          console.error('Error in approve_usd_balance_order:', error);
          throw new TransactionError(
            error.message,
            error.code,
            error.details
          );
        }

        return data;
      }
    } catch (err) {
      console.error('Full error in approveBuyTransaction:', err);
      if (err instanceof TransactionError) {
        throw err;
      }
      throw new TransactionError(
        'Failed to approve buy transaction',
        'APPROVAL_ERROR'
      );
    }
  },

  async createBuyTransaction({
    userId,
    assetId,
    amount,
    pricePerToken,
    paymentMethod
  }: CreateBuyTransactionParams) {
    try {
      console.log('Starting createBuyTransaction:', {
        userId,
        assetId,
        amount,
        pricePerToken,
        paymentMethod
      });

      if (paymentMethod === 'usd_balance') {
        // Calculate fee and total amount
        const fee = amount * pricePerToken * 0.005; // 0.5% fee
        const totalToPay = amount * pricePerToken + fee;

        console.log('Creating USD balance order with params:', {
          p_user_id: userId,
          p_asset_id: assetId,
          p_amount: amount,
          p_price_per_token: pricePerToken,
          p_fee: fee,
          p_total_to_pay: totalToPay
        });

        // Create USD balance order using RPC function
        const { data: transaction, error: createError } = await supabase.rpc(
          'create_usd_balance_order',
          {
            p_user_id: userId,
            p_asset_id: assetId,
            p_amount: amount,
            p_price_per_token: pricePerToken,
            p_fee: fee,
            p_total_to_pay: totalToPay
          }
        );

        if (createError) {
          console.error('Error creating USD balance order:', {
            error: createError,
            params: {
              userId,
              assetId,
              amount,
              pricePerToken,
              fee,
              totalToPay
            }
          });
          throw createError;
        }

        console.log('USD balance order created:', {
          transactionId: transaction.id,
          status: transaction.status,
          metadata: transaction.metadata
        });

        return transaction;
      } else {
        // For bank/USDC payments, create pending transaction
        console.log('Creating pending transaction for non-USD payment:', {
          paymentMethod,
          amount,
          pricePerToken
        });

        const { data, error } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            asset_id: assetId,
            type: 'buy',
            amount: amount,
            price_per_token: pricePerToken,
            status: 'pending',
            metadata: {
              fee_usd: amount * pricePerToken * 0.005,
              payment_method: paymentMethod
            }
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating pending transaction:', {
            error,
            params: {
              userId,
              assetId,
              amount,
              pricePerToken,
              paymentMethod
            }
          });
          throw error;
        }

        console.log('Pending transaction created:', {
          transactionId: data.id,
          status: data.status,
          metadata: data.metadata
        });

        return data;
      }
    } catch (error) {
      console.error('Error in createBuyTransaction:', error);
      throw error;
    }
  },

  async rejectTransaction(transactionId: string): Promise<void> {
    try {
      console.log('Attempting to reject transaction:', transactionId);
      const { error } = await adminSupabase
        .from('transactions')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          cancelled_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      console.log('Rejection response error:', error);

      if (error) {
        console.error('Error rejecting transaction:', error);
        throw new TransactionError(
          'Failed to reject transaction',
          'REJECT_ERROR',
          error.message
        );
      }
      console.log('Successfully rejected transaction:', transactionId);
    } catch (err) {
      console.error('Error in rejectTransaction:', err);
      if (err instanceof TransactionError) throw err;
      throw new TransactionError(
        'Failed to reject transaction',
        'UNKNOWN_ERROR',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  },

  async createSellTransaction({
    userId,
    assetId,
    amount,
    pricePerToken
  }: CreateSellTransactionParams) {
    try {
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

      if (profileError || !profile) {
        console.error('Profile fetch error:', profileError);
        throw new TransactionError(
          'Profile error',
          'PROFILE_ERROR',
          'Failed to verify user profile'
        );
      }

      // Create the transaction record
      const { data: transaction, error } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.user_id,
          asset_id: assetId,
          type: 'sell',
          amount,
          price_per_token: pricePerToken,
          status: 'pending',
          metadata: {
            fee_usd: amount * pricePerToken * 0.005,  // 0.5% fee
            reference: Date.now().toString(),
            payment_method: 'USD'
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      return transaction;
    } catch (err) {
      console.error('Error creating sell transaction:', err);
      throw err;
    }
  },

  async approveDepositWithdrawal({
    transactionId,
    pricePerToken,
    amount
  }: ApproveDepositWithdrawalParams) {
    try {
      const { data, error } = await adminSupabase.rpc('process_deposit_withdrawal', {
        p_transaction_id: transactionId,
        p_price_per_token: pricePerToken,
        p_amount: amount
      });

      if (error) {
        console.error('Error processing deposit/withdrawal:', error);
        throw new Error(`Failed to process deposit/withdrawal: ${error.message}`);
      }

      return data;
    } catch (err) {
      console.error('Error in approveDepositWithdrawal:', err);
      throw err;
    }
  },
}; 