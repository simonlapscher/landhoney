export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          transaction_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          transaction_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_prices: {
        Row: {
          asset_id: string
          id: string
          price: number
          timestamp: string
        }
        Insert: {
          asset_id: string
          id?: string
          price: number
          timestamp?: string
        }
        Update: {
          asset_id?: string
          id?: string
          price?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_prices_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          decimals: number
          description: string | null
          id: string
          main_image: string | null
          max_investment: number
          metadata: Json | null
          min_investment: number
          name: string
          price_per_token: number
          symbol: string
          token_supply: number
          type: Database["public"]["Enums"]["asset_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          decimals?: number
          description?: string | null
          id?: string
          main_image?: string | null
          max_investment: number
          metadata?: Json | null
          min_investment: number
          name: string
          price_per_token: number
          symbol: string
          token_supply: number
          type: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          decimals?: number
          description?: string | null
          id?: string
          main_image?: string | null
          max_investment?: number
          metadata?: Json | null
          min_investment?: number
          name?: string
          price_per_token?: number
          symbol?: string
          token_supply?: number
          type?: Database["public"]["Enums"]["asset_type"]
          updated_at?: string
        }
        Relationships: []
      }
      debt_assets: {
        Row: {
          apr: number
          asset_id: string
          funded_amount: number
          funding_goal: number
          id: string
          location: string
          ltv: number
          metadata: Json | null
          remaining_amount: number
          term: string
        }
        Insert: {
          apr: number
          asset_id: string
          funded_amount?: number
          funding_goal: number
          id?: string
          location: string
          ltv: number
          metadata?: Json | null
          remaining_amount: number
          term: string
        }
        Update: {
          apr?: number
          asset_id?: string
          funded_amount?: number
          funding_goal?: number
          id?: string
          location?: string
          ltv?: number
          metadata?: Json | null
          remaining_amount?: number
          term?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_assets_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          asset_id: string
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          price_per_token: number
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          asset_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          price_per_token: number
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          asset_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          price_per_token?: number
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          asset_id: string
          balance: number
          created_at: string
          id: string
          last_transaction_at: string | null
          total_interest_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          balance?: number
          created_at?: string
          id?: string
          last_transaction_at?: string | null
          total_interest_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          balance?: number
          created_at?: string
          id?: string
          last_transaction_at?: string | null
          total_interest_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_balances_with_value: {
        Row: {
          asset_id: string | null
          balance: number | null
          created_at: string | null
          id: string | null
          last_transaction_at: string | null
          total_interest_earned: number | null
          total_value: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      asset_type: "debt" | "equity" | "commodity"
      transaction_status: "pending" | "completed" | "failed" | "cancelled"
      transaction_type: "buy" | "sell" | "convert" | "earn"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

