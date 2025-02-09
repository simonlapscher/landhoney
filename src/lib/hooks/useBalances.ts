import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../context/AuthContext';

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
        const { data, error } = await supabase
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
        setBalances(data || []);
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