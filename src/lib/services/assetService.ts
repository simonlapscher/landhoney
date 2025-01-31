import { supabase } from '../supabase';
import { Asset, DebtAsset, CommodityAsset } from '../types/asset';

interface AssetPrice {
  price: number;
  timestamp: string;
}

export const assetService = {
  async getAllAssets(): Promise<Asset[]> {
    const { data: assets, error } = await supabase
      .from('assets')
      .select(`
        *,
        debt_assets(
          id,
          apr,
          term_months,
          loan_amount,
          appraised_value,
          status,
          address,
          city,
          state,
          zip_code,
          country,
          images,
          documents,
          metadata
        ),
        user_balances(
          balance
        ),
        asset_prices(
          price,
          timestamp
        )
      `)
      .order('type', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!assets) return [];

    console.log('Full response from Supabase:', JSON.stringify(assets, null, 2));

    return assets.map(asset => {
      if (asset.type === 'debt') {
        if (!asset.debt_assets?.length) {
          console.error('Missing debt_assets data for asset:', asset.id);
          return asset as DebtAsset;
        }

        const debtDetails = asset.debt_assets[0];
        console.log('Raw debt details before conversion:', debtDetails);
        
        // Combine address components for location
        const location = `${debtDetails.city}, ${debtDetails.state}`;
        
        // Calculate LTV as loan_amount / appraised_value
        const ltv = (debtDetails.loan_amount / debtDetails.appraised_value * 100).toFixed(1);
        
        // Calculate funding values using loan_amount and user balances
        const fundingGoal = debtDetails.loan_amount;
        const fundedAmount = asset.user_balances?.reduce((sum: number, balance: { balance: number }) => 
          sum + (balance.balance || 0), 0) || 0;
        const remainingAmount = fundingGoal - fundedAmount;
        
        const numericValues = {
          apr: parseFloat(debtDetails.apr.toString()),
          ltv: parseFloat(ltv) || 0,
          funding_goal: fundingGoal,
          funded_amount: fundedAmount,
          remaining_amount: remainingAmount
        };
        
        console.log('Funding details:', {
          goal: fundingGoal,
          funded: fundedAmount,
          remaining: remainingAmount,
          progress: ((fundedAmount / fundingGoal) * 100).toFixed(1) + '%'
        });
        
        const mappedAsset = {
          ...asset,
          location,
          apr: numericValues.apr,
          ltv: numericValues.ltv,
          term: `${debtDetails.term_months} months`,
          term_months: debtDetails.term_months,
          loan_amount: debtDetails.loan_amount,
          appraised_value: debtDetails.appraised_value,
          funding_goal: numericValues.funding_goal,
          funded_amount: numericValues.funded_amount,
          remaining_amount: numericValues.remaining_amount,
          funding_progress: (numericValues.funded_amount / numericValues.funding_goal) * 100,
          images: debtDetails.images || [asset.main_image]
        } as DebtAsset;
        
        console.log('Mapped debt asset:', mappedAsset);
        return mappedAsset;
      } else {
        return {
          ...asset,
          type: 'commodity' as const,
          asset_prices: asset.asset_prices?.sort((a: AssetPrice, b: AssetPrice) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ) || [],
          main_image: asset.main_image
        } as CommodityAsset;
      }
    });
  },

  async getAssetById(id: string): Promise<Asset | null> {
    console.log('Getting asset by ID:', id);
    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        debt_assets(
          id,
          apr,
          term_months,
          loan_amount,
          appraised_value,
          status,
          address,
          city,
          state,
          zip_code,
          country,
          images,
          documents,
          metadata
        ),
        user_balances(
          balance
        ),
        asset_prices(
          price,
          timestamp
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching asset:', error);
      throw error;
    }
    if (!asset) return null;

    console.log('Raw asset data:', asset);

    if (asset.type === 'debt') {
      const debtDetails = asset.debt_assets[0];
      console.log('Debt details:', debtDetails);
      
      // Combine address components for location
      const location = `${debtDetails.city}, ${debtDetails.state}`;
      
      // Calculate LTV as loan_amount / appraised_value
      const ltv = (debtDetails.loan_amount / debtDetails.appraised_value * 100).toFixed(1);
      
      // Calculate funding values using loan_amount and user balances
      const fundingGoal = debtDetails.loan_amount;
      const fundedAmount = asset.user_balances?.reduce((sum: number, balance: { balance: number }) => 
        sum + (balance.balance || 0), 0) || 0;
      const remainingAmount = fundingGoal - fundedAmount;
      
      const mappedAsset = {
        id: asset.id,
        ...asset,
        location,
        apr: parseFloat(debtDetails.apr.toString()),
        ltv: parseFloat(ltv),
        term: `${debtDetails.term_months} months`,
        term_months: debtDetails.term_months,
        loan_amount: debtDetails.loan_amount,
        appraised_value: debtDetails.appraised_value,
        funding_goal: fundingGoal,
        funded_amount: fundedAmount,
        remaining_amount: remainingAmount,
        funding_progress: (fundedAmount / fundingGoal) * 100,
        images: debtDetails.images || [asset.main_image]
      } as DebtAsset;

      console.log('Mapped debt asset:', mappedAsset);
      return mappedAsset;
    } else {
      const commodityAsset = {
        ...asset,
        type: 'commodity' as const,
        asset_prices: asset.asset_prices?.sort((a: AssetPrice, b: AssetPrice) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ) || [],
        main_image: asset.main_image
      } as CommodityAsset;
      
      console.log('Mapped commodity asset:', commodityAsset);
      return commodityAsset;
    }
  },

  async getLatestPrice(assetId: string): Promise<number> {
    const { data: price, error } = await supabase
      .from('asset_prices')
      .select('price')
      .eq('asset_id', assetId)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return price?.price || 0;
  }
}; 