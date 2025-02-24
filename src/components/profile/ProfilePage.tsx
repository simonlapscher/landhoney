import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/context/AuthContext';
import { toast } from 'react-hot-toast';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { CameraIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

interface Profile {
  id: string;
  user_id: string;
  display_name?: string;
  phone?: string;
  country?: string;
  email?: string;
  usdc_wallet_address?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  avatar_url?: string;
}

type EditingField = 'displayName' | 'email' | 'phone' | 'wallet' | 'bankAccount' | 'routingNumber' | null;

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<EditingField>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phone: '',
    wallet: '',
    bankAccount: '',
    routingNumber: ''
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        displayName: data.display_name || '',
        email: data.email || user?.email || '',
        phone: data.phone || '',
        wallet: data.usdc_wallet_address || '',
        bankAccount: data.bank_account_number || '',
        routingNumber: data.bank_routing_number || ''
      });

      // Set the avatar URL with the full public URL if it exists
      if (data.avatar_url) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.avatar_url);
        setAvatarUrl(publicUrl);
      } else {
        setAvatarUrl(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (field: EditingField) => {
    setEditingField(field);
  };

  const handleCancel = (field: EditingField) => {
    setEditingField(null);
    // Reset form data to original values
    if (profile && field) {
      const fieldMapping: Record<Exclude<EditingField, null>, keyof Profile> = {
        displayName: 'display_name',
        email: 'email',
        phone: 'phone',
        wallet: 'usdc_wallet_address',
        bankAccount: 'bank_account_number',
        routingNumber: 'bank_routing_number'
      };
      
      setFormData(prev => ({
        ...prev,
        [field]: profile[fieldMapping[field]] || ''
      }));
    }
  };

  const handleSave = async (field: EditingField) => {
    if (!field) return;

    try {
      let updateData = {};
      switch (field) {
        case 'displayName':
          // Call the RPC function to update both display name and bee name
          const { data: updatedProfile, error: rpcError } = await supabase.rpc(
            'update_profile_display_name',
            { 
              p_user_id: user?.id,
              p_display_name: formData.displayName.trim(),
              p_bee_name: formData.displayName.trim()
            }
          );
          
          if (rpcError) throw rpcError;
          setProfile(updatedProfile);
          setEditingField(null);
          toast.success('Display name and bee name updated');
          return;
        case 'email':
          updateData = { email: formData.email.trim() };
          break;
        case 'phone':
          updateData = { phone: formData.phone.trim() };
          break;
        case 'wallet':
          updateData = { usdc_wallet_address: formData.wallet.trim() };
          break;
        case 'bankAccount':
          updateData = { bank_account_number: formData.bankAccount.trim() };
          break;
        case 'routingNumber':
          updateData = { bank_routing_number: formData.routingNumber.trim() };
          break;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...updateData } : null);
      setEditingField(null);
      toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} saved`);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploadingAvatar(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: filePath,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id);

      if (updateError) {
        throw updateError;
      }

      // Get the public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Error uploading profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const maskSensitiveInfo = (value: string, type: 'phone' | 'financial') => {
    if (!value) return '';
    if (type === 'phone') {
      return `xxxxxxxx${value.slice(-2)}`;
    }
    // For financial info, show first 4 and last 4
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // The AuthContext will handle the redirect through its session listener
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-4xl font-bold text-light mb-8">Profile</h1>

      <div className="space-y-8">
        {/* Profile Header with Avatar */}
        <div className="flex items-center gap-6 pb-6 border-b border-light/10">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-light/10" />
            )}
            <div className="absolute bottom-0 right-0 p-1 bg-light/10 rounded-full cursor-pointer">
              <label className="cursor-pointer">
                <CameraIcon className="w-5 h-5 text-light" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>
          </div>
          <div>
            {editingField === 'displayName' ? (
              <div className="space-y-2">
                <Input
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Display Name"
                  className="text-lg"
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSave('displayName')}
                    disabled={!formData.displayName.trim() || formData.displayName === profile?.display_name}
                  >
                    Save
                  </Button>
                  <button
                    onClick={() => handleCancel('displayName')}
                    className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-medium text-light">
                  {profile?.display_name || 'Display Name'}
                </h2>
                <button
                  onClick={() => handleEdit('displayName')}
                  className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-6 pb-6 border-b border-light/10">
          <h3 className="text-xl font-semibold text-light">Contact info</h3>
          
          {/* Email Field */}
          <div className="flex items-start gap-4">
            <div className="flex-grow">
              <div className="text-base text-light/60 mb-1">Email address</div>
              {editingField === 'email' ? (
                <div className="space-y-2">
                  <Input
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email"
                    className="text-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave('email')}
                      disabled={!formData.email.trim() || formData.email === profile?.email}
                    >
                      Save
                    </Button>
                    <button
                      onClick={() => handleCancel('email')}
                      className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-lg text-light">{profile?.email || user?.email}</div>
              )}
            </div>
            {editingField !== 'email' && (
              <button
                onClick={() => handleEdit('email')}
                className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors h-min"
              >
                Edit
              </button>
            )}
          </div>

          {/* Phone Field */}
          <div className="flex items-start gap-4">
            <div className="flex-grow">
              <div className="text-base text-light/60 mb-1">Phone number</div>
              {editingField === 'phone' ? (
                <div className="space-y-2">
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Phone"
                    className="text-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave('phone')}
                      disabled={!formData.phone.trim() || formData.phone === profile?.phone}
                    >
                      Save
                    </Button>
                    <button
                      onClick={() => handleCancel('phone')}
                      className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-lg text-light">
                  {profile?.phone ? maskSensitiveInfo(profile.phone, 'phone') : 'Not set'}
                </div>
              )}
            </div>
            {editingField !== 'phone' && (
              <button
                onClick={() => handleEdit('phone')}
                className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors h-min"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Financial Info */}
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-light">Financial Information</h3>
          
          {/* USDC Wallet */}
          <div className="flex items-start gap-4">
            <div className="flex-grow">
              <div className="text-base text-light/60 mb-1">USDC Wallet Address</div>
              {editingField === 'wallet' ? (
                <div className="space-y-2">
                  <Input
                    value={formData.wallet}
                    onChange={(e) => setFormData(prev => ({ ...prev, wallet: e.target.value }))}
                    placeholder="Wallet Address"
                    className="text-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave('wallet')}
                      disabled={!formData.wallet.trim() || formData.wallet === profile?.usdc_wallet_address}
                    >
                      Save
                    </Button>
                    <button
                      onClick={() => handleCancel('wallet')}
                      className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-lg text-light">
                  {profile?.usdc_wallet_address ? 
                    maskSensitiveInfo(profile.usdc_wallet_address, 'financial') : 
                    'Not set'}
                </div>
              )}
            </div>
            {editingField !== 'wallet' && (
              <button
                onClick={() => handleEdit('wallet')}
                className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors h-min"
              >
                Edit
              </button>
            )}
          </div>

          {/* Bank Account */}
          <div className="flex items-start gap-4">
            <div className="flex-grow">
              <div className="text-base text-light/60 mb-1">Bank Account Number</div>
              {editingField === 'bankAccount' ? (
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={formData.bankAccount}
                    onChange={(e) => setFormData(prev => ({ ...prev, bankAccount: e.target.value }))}
                    placeholder="Bank Account Number"
                    className="text-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave('bankAccount')}
                      disabled={!formData.bankAccount.trim() || formData.bankAccount === profile?.bank_account_number}
                    >
                      Save
                    </Button>
                    <button
                      onClick={() => handleCancel('bankAccount')}
                      className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-lg text-light">
                  {profile?.bank_account_number ? 
                    maskSensitiveInfo(profile.bank_account_number, 'financial') : 
                    'Not set'}
                </div>
              )}
            </div>
            {editingField !== 'bankAccount' && (
              <button
                onClick={() => handleEdit('bankAccount')}
                className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors h-min"
              >
                Edit
              </button>
            )}
          </div>

          {/* Routing Number */}
          <div className="flex items-start gap-4">
            <div className="flex-grow">
              <div className="text-base text-light/60 mb-1">Bank Routing Number</div>
              {editingField === 'routingNumber' ? (
                <div className="space-y-2">
                  <Input
                    type="password"
                    value={formData.routingNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, routingNumber: e.target.value }))}
                    placeholder="Routing Number"
                    className="text-lg"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleSave('routingNumber')}
                      disabled={!formData.routingNumber.trim() || formData.routingNumber === profile?.bank_routing_number}
                    >
                      Save
                    </Button>
                    <button
                      onClick={() => handleCancel('routingNumber')}
                      className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-lg text-light">
                  {profile?.bank_routing_number ? 
                    maskSensitiveInfo(profile.bank_routing_number, 'financial') : 
                    'Not set'}
                </div>
              )}
            </div>
            {editingField !== 'routingNumber' && (
              <button
                onClick={() => handleEdit('routingNumber')}
                className="px-3 py-1 text-sm bg-light/10 rounded-lg hover:bg-light/20 transition-colors h-min"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-light/10">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-3 py-2 text-red-500 hover:text-red-400 hover:bg-red-500/5 transition-colors text-base font-medium rounded-lg"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};