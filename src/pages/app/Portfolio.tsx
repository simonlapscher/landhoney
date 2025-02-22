import React, { useEffect } from 'react';

const fetchPortfolioData = async (isBackgroundRefresh = false) => {
    if (!user) return;

    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setIsRefreshing(true);

      // Get all data in parallel using Promise.all
      const [
        { data: balancesData, error: balancesError },
        { data: profile, error: profileError },
        { data: stakingPositions, error: stakingError }
      ] = await Promise.all([
        // Get balances with asset info
        supabase
          .from('user_balances')
          .select(`
            *,
            asset:assets (
              id,
              symbol,
              name,
              type,
              price_per_token,
              main_image,
              location
            )
          `)
          .eq('user_id', user.id),
        
        // Get profile
        supabase.rpc('get_profile_by_email', { p_email: user.email }),
        
        // Get staking positions
        supabase
          .from('staking_positions')
          .select(`
            id,
            amount,
            ownership_percentage,
            pool:pools (
              id,
              type,
              total_value_locked,
              main_asset:assets (
                price_per_token
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'active')
      ]);

      if (balancesError) throw balancesError;
      if (profileError) throw profileError;
      if (stakingError) throw stakingError;
      if (!profile) throw new Error('User profile not found');

      // Process balances
      const processedBalances = balancesData.map(balance => ({
        ...balance,
        total_value: balance.balance * balance.asset.price_per_token
      }));

      // Add USD with zero balance if it doesn't exist
      const usdAsset = processedBalances.find(b => b.asset.symbol === 'USD')?.asset;
      if (!processedBalances.some(b => b.asset.symbol === 'USD') && usdAsset) {
        processedBalances.unshift({
          id: 'usd-placeholder',
          user_id: user.id,
          asset_id: usdAsset.id,
          balance: 0,
          total_value: 0,
          total_interest_earned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_transaction_at: null,
          asset: usdAsset
        });
      }

      setBalances(processedBalances);

      // Get transactions and staking info in parallel
      const [transactionsData, stakingData, btcData] = await Promise.all([
        transactionService.getUserTransactions(profile.user_id),
        transactionService.getHoneyStakingInfo(profile.user_id),
        transactionService.getBitcoinStakingInfo(profile.user_id)
      ]);

      // Calculate 30-day returns
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const returns = transactionsData
        .filter(t => 
          t.type === 'loan_distribution' && 
          t.status === 'completed' &&
          new Date(t.created_at) >= thirtyDaysAgo
        )
        .reduce((sum, t) => sum + (t.metadata?.usd_amount || 0), 0);
      
      setReturns30D(returns);

      // Calculate staking gains
      if (stakingPositions) {
        const totalGains = stakingPositions.reduce((sum, position) => {
          const initialStakeUSD = position.amount * position.pool.main_asset.price_per_token;
          const currentValue = position.ownership_percentage * position.pool.total_value_locked;
          return sum + (currentValue - initialStakeUSD);
        }, 0);

        setStakingGains(totalGains);
      }

      // Update state with all fetched data
      if (transactionsData) {
        const mappedTransactions = transactionsData.map(t => ({
          ...t,
          asset: {
            ...t.asset,
            type: t.asset.symbol.startsWith('DEBT') ? 'debt' : 'commodity'
          }
        }));

        setTransactions(mappedTransactions);
        setStakingInfo(stakingData);
        
        if (btcData) {
          setBtcStakingInfo({
            btcXBalance: btcData.bitcoinXBalance,
            stakingPercentage: btcData.stakingPercentage
          });
        }
        
        const btcBalanceData = processedBalances.find(b => b.asset.symbol === 'BTC');
        setBtcBalance(btcBalanceData?.balance || 0);
        setBtcAsset(btcBalanceData?.asset || null);
      }
    } catch (err) {
      console.error('Error fetching portfolio data:', err);
      if (!isBackgroundRefresh) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
      setIsRefreshing(false);
    }
  };

// Auto-refresh interval
useEffect(() => {
  if (!user || isAdminPortal) return;

  const interval = setInterval(() => {
    fetchPortfolioData(true);  // Background refresh for subsequent updates
  }, 300000); // Changed from 30000 to 300000 (5 minutes)

  return () => clearInterval(interval);
}, [user, isAdminPortal]); 