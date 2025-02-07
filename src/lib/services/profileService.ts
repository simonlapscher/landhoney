import { supabase } from '../supabase';

export const profileService = {
  async updateFinancialInfo(userId: string, data: {
    usdcWalletAddress?: string;
    bankAccountNumber?: string;
    bankRoutingNumber?: string;
  }) {
    const { error } = await supabase
      .from('profiles')
      .update({
        usdc_wallet_address: data.usdcWalletAddress,
        bank_account_number: data.bankAccountNumber,
        bank_routing_number: data.bankRoutingNumber,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;
  },

  async getFinancialInfo(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('usdc_wallet_address, bank_account_number, bank_routing_number')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }
}; 