import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

// Define the exact shape of what we expect from Supabase
interface DatabaseBalance {
  balance: number;
  asset: {
    id: string;
    symbol: string;
    name: string;
  } | null;
}

// Define our cleaned up Balance type for use in the app
interface Balance {
  asset: {
    id: string;
    symbol: string;
    name: string;
  };
  balance: number;
}

export const useBalances = () => {
  const { user } = useAuth();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalances = async () => {
      if (!user) {
        setBalances([]);
        setLoading(false);
        return;
      }

      try {
        const { data: rawData, error } = await supabase
          .from('user_balances')
          .select(`
            balance,
            asset:assets (
              id,
              symbol,
              name
            )
          `)
          .eq('user_id', user.id);

        if (error) throw error;

        // First cast to unknown, then to our expected type
        const data = rawData as unknown as DatabaseBalance[];
        
        // Safely transform the data with proper type checking
        const transformedData: Balance[] = data
          ?.filter((item): item is DatabaseBalance & { asset: NonNullable<DatabaseBalance['asset']> } => 
            item?.asset !== null && 
            typeof item?.asset === 'object' &&
            'id' in item.asset &&
            'symbol' in item.asset &&
            'name' in item.asset
          )
          .map(item => ({
            balance: item.balance,
            asset: {
              id: item.asset.id,
              symbol: item.asset.symbol,
              name: item.asset.name
            }
          })) || [];
        
        setBalances(transformedData);
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError('Failed to fetch balances');
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [user]);

  return { balances, loading, error };
}; 