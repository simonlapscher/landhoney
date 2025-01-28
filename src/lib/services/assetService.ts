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
        debt_assets(*),
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
        
        // Combine city and state for location
        const location = `${debtDetails.city}, ${debtDetails.state}`;
        
        // Add image gallery for Beverly Hills property
        const images = debtDetails.city === 'Beverly Hills' ? [
          'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-1.png',
          'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-2.png',
          'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-3.png',
          'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-4.png'
        ] : [asset.main_image];
        
        // Calculate LTV as loan_amount / appraised_value
        const ltv = (debtDetails.loan_amount / debtDetails.appraised_value * 100).toFixed(1);
        
        // Calculate funding values using loan_amount
        const fundingGoal = debtDetails.loan_amount;
        // For now, assume no investments yet
        const fundedAmount = 0;
        const remainingAmount = fundingGoal - fundedAmount;
        
        const numericValues = {
          apr: parseFloat(debtDetails.apr) || 0,
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
          funding_goal: numericValues.funding_goal,
          funded_amount: numericValues.funded_amount,
          remaining_amount: numericValues.remaining_amount,
          funding_progress: (numericValues.funded_amount / numericValues.funding_goal) * 100,
          images: images
        } as DebtAsset;
        
        console.log('Mapped debt asset:', mappedAsset);
        return mappedAsset;
      } else {
        return {
          ...asset,
          asset_prices: asset.asset_prices.sort((a: AssetPrice, b: AssetPrice) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ),
        } as CommodityAsset;
      }
    });
  },

  async getAssetById(id: string): Promise<Asset | null> {
    const { data: asset, error } = await supabase
      .from('assets')
      .select(`
        *,
        debt_assets(*),
        asset_prices(
          price,
          timestamp
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!asset) return null;

    if (asset.type === 'debt') {
      const debtDetails = asset.debt_assets[0];
      
      // Calculate LTV as loan_amount / appraised_value
      const ltv = (debtDetails.loan_amount / debtDetails.appraised_value * 100).toFixed(1);
      
      // Add image gallery for Beverly Hills property
      const images = debtDetails.city === 'Beverly Hills' ? [
        'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-1.png',
        'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-2.png',
        'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-3.png',
        'https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/TX-4.png'
      ] : [asset.main_image];
      
      return {
        ...asset,
        ...debtDetails,
        ltv: parseFloat(ltv),
        term: `${debtDetails.term_months} months`,
        images: images
      } as DebtAsset;
    } else {
      return {
        ...asset,
        asset_prices: asset.asset_prices.sort((a: AssetPrice, b: AssetPrice) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
      } as CommodityAsset;
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