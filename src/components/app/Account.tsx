import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { profileService } from '../../lib/services/profileService';

export const Account: React.FC = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    usdcWalletAddress: '',
    bankAccountNumber: '',
    bankRoutingNumber: ''
  });

  useEffect(() => {
    const loadFinancialInfo = async () => {
      if (!user) return;
      try {
        const data = await profileService.getFinancialInfo(user.id);
        setFormData({
          usdcWalletAddress: data.usdc_wallet_address || '',
          bankAccountNumber: data.bank_account_number || '',
          bankRoutingNumber: data.bank_routing_number || ''
        });
      } catch (err) {
        console.error('Error loading financial info:', err);
      }
    };

    loadFinancialInfo();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await profileService.updateFinancialInfo(user.id, formData);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-dark-2 rounded-lg p-6">
        {/* Existing profile fields */}
        
        <div className="mt-6 border-t border-dark-3 pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-light">Payment Information</h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-primary hover:text-primary/80"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-light/60 mb-1">
                  USDC Wallet Address
                </label>
                <input
                  type="text"
                  value={formData.usdcWalletAddress}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    usdcWalletAddress: e.target.value
                  }))}
                  className="w-full bg-dark-1 border border-dark-3 rounded-lg px-4 py-2 text-light"
                  placeholder="0x..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light/60 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={formData.bankAccountNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    bankAccountNumber: e.target.value
                  }))}
                  className="w-full bg-dark-1 border border-dark-3 rounded-lg px-4 py-2 text-light"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light/60 mb-1">
                  Bank Routing Number
                </label>
                <input
                  type="text"
                  value={formData.bankRoutingNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    bankRoutingNumber: e.target.value
                  }))}
                  className="w-full bg-dark-1 border border-dark-3 rounded-lg px-4 py-2 text-light"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-4 mt-4">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-lg bg-dark-3 text-light hover:bg-dark-4"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-primary text-dark hover:bg-primary/80"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-sm text-light/60">USDC Wallet Address</div>
                <div className="text-light">
                  {formData.usdcWalletAddress || 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-light/60">Bank Account Number</div>
                <div className="text-light">
                  {formData.bankAccountNumber ? '••••' + formData.bankAccountNumber.slice(-4) : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-light/60">Bank Routing Number</div>
                <div className="text-light">
                  {formData.bankRoutingNumber ? '••••' + formData.bankRoutingNumber.slice(-4) : 'Not set'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 