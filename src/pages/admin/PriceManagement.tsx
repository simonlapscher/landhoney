import React, { useEffect, useState } from 'react';
import { adminSupabase } from '../../lib/supabase';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  type: string;
  price_per_token: number;
  current_price?: number;
}

interface PriceHistory {
  id: string;
  asset_id: string;
  price: number;
  created_at: string;
}

export const PriceManagement: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceUpdates, setPriceUpdates] = useState<Record<string, string>>({});
  const [updateStatus, setUpdateStatus] = useState<Record<string, { status: 'success' | 'error', message: string }>>({});

  const fetchAssets = async () => {
    try {
      const { data: assetsData, error: assetsError } = await adminSupabase
        .from('assets')
        .select('*')
        .order('symbol');

      if (assetsError) throw assetsError;

      // Fetch the latest price history for each asset
      const { data: priceHistoryData, error: priceHistoryError } = await adminSupabase
        .from('price_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (priceHistoryError) throw priceHistoryError;

      // Create a map of latest prices
      const latestPrices = priceHistoryData.reduce((acc: Record<string, number>, curr: PriceHistory) => {
        if (!acc[curr.asset_id]) {
          acc[curr.asset_id] = curr.price;
        }
        return acc;
      }, {});

      // Combine asset data with latest prices
      const assetsWithPrices = assetsData.map((asset: Asset) => ({
        ...asset,
        current_price: latestPrices[asset.id] || asset.price_per_token
      }));

      setAssets(assetsWithPrices);
      
      // Initialize price updates with current prices
      const initialPriceUpdates = assetsWithPrices.reduce((acc: Record<string, string>, asset: Asset) => {
        acc[asset.id] = asset.current_price?.toString() || '';
        return acc;
      }, {});
      setPriceUpdates(initialPriceUpdates);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handlePriceChange = (assetId: string, value: string) => {
    setPriceUpdates(prev => ({
      ...prev,
      [assetId]: value
    }));
    // Clear any previous status for this asset
    setUpdateStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[assetId];
      return newStatus;
    });
  };

  const handleUpdatePrice = async (assetId: string) => {
    try {
      const newPrice = parseFloat(priceUpdates[assetId]);
      if (isNaN(newPrice) || newPrice <= 0) {
        throw new Error('Invalid price value');
      }

      const { error: updateError } = await adminSupabase.rpc('update_asset_price', {
        p_asset_id: assetId,
        p_new_price: newPrice
      });

      if (updateError) throw updateError;

      const { error: logError } = await adminSupabase
        .from('admin_audit_logs')
        .insert({
          action_type: 'price_update',
          details: {
            asset_id: assetId,
            old_price: assets.find(a => a.id === assetId)?.current_price,
            new_price: newPrice
          }
        });

      if (logError) throw logError;

      setUpdateStatus(prev => ({
        ...prev,
        [assetId]: { status: 'success', message: 'Price updated' }
      }));

      // Clear the success message after 3 seconds
      setTimeout(() => {
        setUpdateStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[assetId];
          return newStatus;
        });
      }, 3000);

      await fetchAssets();
    } catch (err) {
      console.error('Error updating price:', err);
      setUpdateStatus(prev => ({
        ...prev,
        [assetId]: { status: 'error', message: err instanceof Error ? err.message : 'Failed to update price' }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2 text-light">Price Management</h1>
      <p className="text-light/60 mb-6">Update asset prices and view price history</p>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="bg-dark-2 rounded-lg overflow-hidden">
        <div className="grid grid-cols-5 gap-4 p-4 text-light/60 text-sm border-b border-light/10">
          <div className="text-left">Asset</div>
          <div className="text-left">Symbol</div>
          <div className="text-left">Current Price</div>
          <div className="text-left">New Price</div>
          <div className="text-left">Action</div>
        </div>

        <div className="divide-y divide-light/10">
          {assets
            .filter(asset => asset.symbol !== 'HONEYX') // Filter out HoneyX
            .map(asset => (
            <div key={asset.id} className="grid grid-cols-5 gap-4 p-4 items-center">
              <div className="text-light">{asset.name}</div>
              <div className="text-light">{asset.symbol}</div>
              <div className="text-light">${asset.current_price?.toLocaleString()}</div>
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceUpdates[asset.id] || ''}
                  onChange={(e) => handlePriceChange(asset.id, e.target.value)}
                  className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
                  placeholder="Enter new price"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
              </div>
              <div>
                <button
                  onClick={() => handleUpdatePrice(asset.id)}
                  className="px-4 py-2 bg-primary text-dark rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Update
                </button>
                {updateStatus[asset.id] && (
                  <span className={`ml-2 text-sm ${
                    updateStatus[asset.id].status === 'success' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {updateStatus[asset.id].message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}; 