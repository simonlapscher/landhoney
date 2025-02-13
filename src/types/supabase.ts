export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      assets: {
        Row: {
          id: string
          symbol: string
          name: string
          type: 'debt' | 'commodity' | 'cash'
          price_per_token: number
          created_at: string
          updated_at: string
          main_image: string | null
          description: string | null
          decimals: number
          token_supply: number | null
          min_investment: number | null
          max_investment: number | null
        }
      }
      pools: {
        Row: {
          id: string
          type: 'bitcoin' | 'honey'
          main_asset_id: string
          apr: number
          max_size: number
          is_paused: boolean
          total_value_locked: number
          created_at: string
          updated_at: string
        }
      }
      pool_assets: {
        Row: {
          pool_id: string
          asset_id: string
          balance: number
          created_at: string
          updated_at: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          asset_id: string
          type: 'buy' | 'sell' | 'stake' | 'unstake' | 'deposit' | 'withdraw'
          amount: number
          price_per_token: number
          status: 'pending' | 'completed' | 'failed' | 'cancelled'
          metadata: Json
          created_at: string
          updated_at: string
        }
      }
      user_balances: {
        Row: {
          id: string
          user_id: string
          asset_id: string
          balance: number
          total_interest_earned: number
          created_at: string
          updated_at: string
          last_transaction_at: string | null
        }
      }
    }
    Functions: {
      get_pool_for_asset: {
        Args: { p_asset_symbol: string }
        Returns: string
      }
      stake_bitcoin: {
        Args: {
          p_user_id: string
          p_amount: number
          p_btc_asset_id: string
          p_btcx_asset_id: string
          p_price_per_token: number
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      unstake_bitcoin: {
        Args: {
          p_user_id: string
          p_amount: number
          p_btc_asset_id: string
          p_btcx_asset_id: string
          p_price_per_token: number
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      stake_honey: {
        Args: {
          p_user_id: string
          p_amount: number
          p_honey_id: string
          p_honeyx_id: string
          p_price_per_token: number
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
      unstake_honey: {
        Args: {
          p_user_id: string
          p_amount: number
          p_honey_id: string
          p_honeyx_id: string
          p_price_per_token: number
        }
        Returns: Database['public']['Tables']['transactions']['Row']
      }
    }
  }
} 