import React, { useState, useEffect } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { formatCurrency } from '../../utils/format';

interface Asset {
  id: string;
  name: string;
  symbol: string;
  price_per_token: number;
  type: string;
}

interface User {
  id: string;
  email: string;
}

// Add a mock PLN asset for the UI
const POLLEN_ASSET = {
  id: 'pollen',
  name: 'Pollen',
  symbol: 'PLN',
  price_per_token: 0,
  type: 'pollen'
};

export const TokenMinting: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [isTokenAmount, setIsTokenAmount] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [success, setSuccess] = useState<{ amount: string; asset: string; user: string } | null>(null);

  // Fetch assets on component mount
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await adminSupabase
          .from('assets')
          .select('*')
          .order('name');

        if (error) throw error;
        // Add Pollen as a mintable asset
        setAssets([POLLEN_ASSET, ...(data || [])]);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Failed to load assets');
      }
    };

    fetchAssets();
  }, []);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!userSearch) {
        setUsers([]);
        return;
      }

      try {
        const { data, error } = await adminSupabase
          .rpc('search_users_by_email', {
            search_term: userSearch
          });

        if (error) throw error;
        setUsers(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setError('Failed to search users');
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [userSearch]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimals
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setAmount(value);
    }
  };

  const calculateTokenAmount = () => {
    if (!selectedAsset || !amount) return 0;
    return isTokenAmount 
      ? parseFloat(amount)
      : parseFloat(amount) / selectedAsset.price_per_token;
  };

  const calculateUsdAmount = () => {
    if (!selectedAsset || !amount) return 0;
    // Return 0 for pollen since it has no USD value
    if (selectedAsset.id === 'pollen') return 0;
    return isTokenAmount 
      ? parseFloat(amount) * selectedAsset.price_per_token
      : parseFloat(amount);
  };

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setUserSearch(user.email);
    setUsers([]);
    setError(null); // Clear any previous errors
  };

  const handleMint = async () => {
    if (!selectedAsset || !selectedUser || !amount) return;

    setLoading(true);
    setError(null);
    
    try {
      const tokenAmount = isTokenAmount 
        ? parseFloat(amount)
        : parseFloat(amount) / (selectedAsset.price_per_token || 1); // Use 1 for pollen to avoid division by zero

      if (selectedAsset.id === 'pollen') {
        // Use award_pollen for pollen minting
        await adminSupabase.rpc('award_pollen', {
          p_user_id: selectedUser.id,
          p_amount: tokenAmount,
          p_distribution_type: 'admin_mint',
          p_metadata: {
            source: 'admin_minting',
            minted_by: (await adminSupabase.auth.getUser()).data.user?.id
          }
        });
      } else {
        // Regular token minting for other assets
        await adminSupabase.rpc('mint_tokens', {
          p_user_id: selectedUser.id,
          p_asset_id: selectedAsset.id,
          p_amount: tokenAmount,
          p_price_per_token: selectedAsset.price_per_token
        });
      }

      setSuccess({
        amount: `${tokenAmount.toFixed(8)} ${selectedAsset.symbol}`,
        asset: selectedAsset.name,
        user: selectedUser.email
      });
      
      // Reset form
      setSelectedAsset(null);
      setSelectedUser(null);
      setAmount('');
      setUsers([]);
      setUserSearch('');
    } catch (err) {
      console.error('Error minting tokens:', err);
      setError(err instanceof Error ? err.message : 'Error minting tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-light">Token Minting</h1>
        <p className="text-light/60">Mint tokens to a specific user</p>
      </div>

      {success ? (
        <div className="bg-[#00D54B]/10 border border-[#00D54B]/20 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-[#00D54B] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-light mb-2">Tokens Minted Successfully</h2>
          <p className="text-light/80">
            Minted {success.amount} to {success.user}
          </p>
          <button
            onClick={() => setSuccess(null)}
            className="mt-4 px-4 py-2 bg-[#00D54B] text-dark rounded-lg hover:bg-[#00D54B]/90 transition-colors"
          >
            Mint More Tokens
          </button>
        </div>
      ) : (
        <div className="bg-dark-2 rounded-lg p-6 max-w-xl">
          {!showConfirmation ? (
            <div className="space-y-6">
              {/* User Selection */}
              <div>
                <label className="block text-light/60 mb-2">User</label>
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setSelectedUser(null); // Clear selected user when search changes
                      setError(null); // Clear any previous errors
                    }}
                    placeholder="Search by email"
                    className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
                    style={{ backgroundColor: '#1a1a1a' }}
                  />
                  {users.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-dark-2 rounded-lg overflow-hidden shadow-lg border border-dark-3">
                      {users.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className="w-full px-3 py-2 text-left text-light hover:bg-dark-4 transition-colors"
                          style={{ backgroundColor: '#1a1a1a' }}
                        >
                          {user.email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-light/60 mb-2">Asset</label>
                <select
                  value={selectedAsset?.id || ''}
                  onChange={(e) => setSelectedAsset(assets.find(a => a.id === e.target.value) || null)}
                  className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
                  style={{ backgroundColor: '#1a1a1a' }}
                >
                  <option value="">Select an asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-light/60">Amount</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setIsTokenAmount(false)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        !isTokenAmount
                          ? 'bg-primary text-dark'
                          : 'bg-dark-3 text-light/60 hover:text-light'
                      }`}
                    >
                      USD Amount
                    </button>
                    <button
                      onClick={() => setIsTokenAmount(true)}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        isTokenAmount
                          ? 'bg-primary text-dark'
                          : 'bg-dark-3 text-light/60 hover:text-light'
                      }`}
                    >
                      Token Amount
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={isTokenAmount ? "Enter token amount" : "Enter USD amount"}
                  className="w-full px-3 py-2 bg-dark-2 border border-dark-3 rounded-lg text-white placeholder-light/40 focus:outline-none focus:border-primary focus:ring-0"
                  style={{ backgroundColor: '#1a1a1a' }}
                />
                {selectedAsset && amount && (
                  <div className="mt-2 text-light/60">
                    {isTokenAmount ? (
                      <p>≈ {formatCurrency(calculateUsdAmount())}</p>
                    ) : (
                      <p>≈ {calculateTokenAmount().toFixed(4)} {selectedAsset.symbol}</p>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!selectedAsset || !selectedUser || !amount || loading}
                className="w-full bg-primary text-dark font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Review Minting
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-light">Confirm Minting</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between py-2 border-b border-light/10">
                  <span className="text-light/60">User</span>
                  <span className="text-light">{selectedUser?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-light/10">
                  <span className="text-light/60">Asset</span>
                  <span className="text-light">{selectedAsset?.name} ({selectedAsset?.symbol})</span>
                </div>
                <div className="flex justify-between py-2 border-b border-light/10">
                  <span className="text-light/60">Token Amount</span>
                  <span className="text-light">{calculateTokenAmount().toFixed(4)} {selectedAsset?.symbol}</span>
                </div>
                {selectedAsset?.id !== 'pollen' && (
                  <div className="flex justify-between py-2 border-b border-light/10">
                    <span className="text-light/60">USD Value</span>
                    <span className="text-light">{formatCurrency(calculateUsdAmount())}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 bg-dark-3 text-light font-medium py-3 rounded-lg hover:bg-dark-4 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleMint}
                  disabled={loading}
                  className="flex-1 bg-primary text-dark font-medium py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Minting...' : 'Confirm Minting'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 