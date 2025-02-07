import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Button } from '../common/Button';
import { PencilIcon, CameraIcon } from '@heroicons/react/24/outline';
import { Input } from '../common/Input';

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
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingFinancial, setIsEditingFinancial] = useState(false);
  const [isEditingUSDC, setIsEditingUSDC] = useState(false);
  const [isEditingBankAccount, setIsEditingBankAccount] = useState(false);
  const [isEditingRoutingNumber, setIsEditingRoutingNumber] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>("https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/honeycito.png");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [financialInfo, setFinancialInfo] = useState({
    usdcWalletAddress: '',
    bankAccountNumber: '',
    bankRoutingNumber: ''
  });

  useEffect(() => {
    console.log('Current user:', user);
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setEmail(user?.email || '');
      setPhone(profile.phone || '');
    }
  }, [profile, user]);

  const fetchProfile = async () => {
    try {
      if (!user?.email) {
        console.log('No authenticated user found');
        return;
      }

      console.log('Fetching profile for email:', user.email);

      // Get profile using RPC function
      const { data: profile, error: profileError } = await supabase.rpc(
        'get_profile_by_email',
        { p_email: user.email }
      );

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Failed to fetch profile. Please try again.');
        return;
      }

      console.log('Found profile:', profile);
      setProfile(profile);
      
      // Update financial info from profile data
      setFinancialInfo({
        usdcWalletAddress: profile.usdc_wallet_address || '',
        bankAccountNumber: profile.bank_account_number || '',
        bankRoutingNumber: profile.bank_routing_number || ''
      });

      setError(null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisplayName = async () => {
    try {
      if (!profile?.user_id || !user?.email) {
        console.error('No profile user_id or email found:', { profile, user });
        return;
      }

      console.log('Attempting to save display name:', {
        displayName,
        userId: profile.user_id
      });

      // Update profile using RPC
      const { data: updateData, error: updateError } = await supabase.rpc(
        'update_profile_display_name',
        { 
          p_user_id: profile.user_id,
          p_display_name: displayName
        }
      );

      console.log('Update response:', { updateData, updateError });

      if (updateError) {
        console.error('Error from Supabase:', updateError);
        throw updateError;
      }

      // Then fetch the updated profile using RPC
      const { data: updatedProfile, error: fetchError } = await supabase.rpc(
        'get_profile_by_email',
        { p_email: user.email }
      );

      if (fetchError) {
        console.error('Error fetching updated profile:', fetchError);
        throw fetchError;
      }

      console.log('Updated profile:', updatedProfile);
      
      if (!updatedProfile) {
        console.error('No profile data returned');
        throw new Error('Failed to update display name');
      }

      setProfile(updatedProfile);
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating display name:', error);
      setError('Failed to update display name. Please try again.');
    }
  };

  const handleSaveEmail = async () => {
    try {
      if (!profile?.user_id || !user?.email) {
        console.error('No profile user_id or email found:', { profile, user });
        return;
      }

      console.log('Attempting to save email:', {
        email,
        userId: profile.user_id
      });

      // First update auth email
      const { error: authError } = await supabase.auth.updateUser({
        email: email
      });

      if (authError) {
        console.error('Error updating auth email:', authError);
        throw authError;
      }

      // Then update profile email using RPC
      const { data: updateData, error: updateError } = await supabase.rpc(
        'update_profile_email',
        { 
          p_user_id: profile.user_id,
          p_email: email
        }
      );

      console.log('Update response:', { updateData, updateError });

      if (updateError) {
        console.error('Error from Supabase:', updateError);
        throw updateError;
      }

      // Then fetch the updated profile using RPC
      const { data: updatedProfile, error: fetchError } = await supabase.rpc(
        'get_profile_by_email',
        { p_email: email }  // Use new email here
      );

      if (fetchError) {
        console.error('Error fetching updated profile:', fetchError);
        throw fetchError;
      }

      console.log('Updated profile:', updatedProfile);
      
      if (!updatedProfile) {
        console.error('No profile data returned');
        throw new Error('Failed to update email');
      }

      setProfile(updatedProfile);
      setIsEditingEmail(false);
    } catch (error) {
      console.error('Error updating email:', error);
      setError('Failed to update email. Please try again.');
    }
  };

  const handleSavePhone = async () => {
    try {
      if (!profile?.user_id || !user?.email) {
        console.error('No profile user_id or email found:', { profile, user });
        return;
      }

      console.log('Attempting to save phone:', {
        phone,
        userId: profile.user_id
      });

      // Update phone using RPC
      const { data: updateData, error: updateError } = await supabase.rpc(
        'update_profile_phone',
        { 
          p_user_id: profile.user_id,
          p_phone: phone
        }
      );

      console.log('Update response:', { updateData, updateError });

      if (updateError) {
        console.error('Error from Supabase:', updateError);
        throw updateError;
      }

      // Then fetch the updated profile using RPC
      const { data: updatedProfile, error: fetchError } = await supabase.rpc(
        'get_profile_by_email',
        { p_email: user.email }
      );

      if (fetchError) {
        console.error('Error fetching updated profile:', fetchError);
        throw fetchError;
      }

      console.log('Updated profile:', updatedProfile);
      
      if (!updatedProfile) {
        console.error('No profile data returned');
        throw new Error('Failed to update phone number');
      }

      setProfile(updatedProfile);
      setIsEditingPhone(false);
    } catch (error) {
      console.error('Error updating phone:', error);
      setError('Failed to update phone number. Please try again.');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      setIsUploadingAvatar(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).slice(2)}.${fileExt}`;

      console.log('Uploading file:', {
        file,
        fileName,
        size: file.size,
        type: file.type
      });

      // Upload to avatars bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('File uploaded successfully:', publicUrl);

      // Update profile with new avatar URL
      const { data: updateData, error: updateError } = await supabase.rpc(
        'update_profile_avatar',
        { 
          p_user_id: profile?.user_id,
          p_avatar_url: publicUrl
        }
      );

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      console.log('Profile updated with new avatar:', updateData);
      setAvatarUrl(publicUrl);
      await fetchProfile();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveFinancialInfo = async () => {
    try {
      const { data: updatedProfile, error: updateError } = await supabase.rpc(
        'update_profile_financial_info',
        {
          p_user_id: profile?.user_id,
          p_usdc_wallet_address: financialInfo.usdcWalletAddress,
          p_bank_account_number: financialInfo.bankAccountNumber,
          p_bank_routing_number: financialInfo.bankRoutingNumber
        }
      );

      if (updateError) throw updateError;

      // Update profile and financial info from the returned data
      setProfile(updatedProfile);
      setFinancialInfo({
        usdcWalletAddress: updatedProfile.usdc_wallet_address || '',
        bankAccountNumber: updatedProfile.bank_account_number || '',
        bankRoutingNumber: updatedProfile.bank_routing_number || ''
      });

      // Close the editing state for the specific field being edited
      if (isEditingUSDC) setIsEditingUSDC(false);
      if (isEditingBankAccount) setIsEditingBankAccount(false);
      if (isEditingRoutingNumber) setIsEditingRoutingNumber(false);

    } catch (error) {
      console.error('Error updating financial info:', error);
      setError('Failed to update payment information. Please try again.');
    }
  };

  // Add a helper function to format wallet address
  const formatWalletAddress = (address: string) => {
    if (!address) return 'Not set';
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  if (loading) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-light mb-8">Profile</h1>

      {/* Profile Picture Section */}
      <div className="flex items-center justify-between mb-8 pb-8 border-b border-light/10">
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-light/20"
            />
            <label 
              className="absolute inset-0 flex items-center justify-center bg-dark/80 rounded-full 
                        opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={isUploadingAvatar}
              />
              {isUploadingAvatar ? (
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-light/60 border-t-transparent"/>
              ) : (
                <CameraIcon className="h-6 w-6 text-light/60" />
              )}
            </label>
          </div>
          <div>
            <div className="flex items-center">
              {isEditingName ? (
                <div className="flex-1">
                  <div className="flex items-center">
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter display name"
                      className="!bg-dark-2 w-64"
                    />
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => {
                        setDisplayName(profile?.display_name || '');
                        setIsEditingName(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="mt-4 mb-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveDisplayName}
                      className="rounded-full px-8 py-1.5"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-light flex-1">
                    {profile?.display_name || 'Add a display name'}
                  </h2>
                  <Button
                    variant="secondary"
                    className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                    onClick={() => setIsEditingName(true)}
                  >
                    Edit
                  </Button>
                </>
              )}
            </div>
            <p className="text-light/60 mt-4">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Personal Info Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-light mb-6">Personal info</h3>

        <div className="space-y-8">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-light/60 mb-1">
              Email address
            </label>
            <div className="flex items-center">
              {isEditingEmail ? (
                <div className="flex-1">
                  <div className="flex items-center">
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      className="!bg-dark-2 w-[300px]"
                    />
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => {
                        setEmail(user?.email || '');
                        setIsEditingEmail(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="mt-4 mb-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveEmail}
                      className="rounded-full px-8 py-1.5"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-w-[400px] flex items-center justify-between">
                    <p className="text-light text-lg">{user?.email}</p>
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => setIsEditingEmail(true)}
                    >
                      Edit
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-light/60 mb-1">
              Phone number
            </label>
            <div className="flex items-center">
              {isEditingPhone ? (
                <div className="flex-1">
                  <div className="flex items-center">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="!bg-dark-2 w-[300px]"
                    />
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => {
                        setPhone(profile?.phone || '');
                        setIsEditingPhone(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="mt-4 mb-4">
                    <Button
                      variant="primary"
                      onClick={handleSavePhone}
                      className="rounded-full px-8 py-1.5"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="max-w-[400px] flex items-center justify-between">
                    <p className="text-light text-lg">
                      {profile?.phone ? `XXXXXXXX${profile.phone.slice(-4)}` : 'Not set'}
                    </p>
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => setIsEditingPhone(true)}
                    >
                      Edit
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Information Section */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-light mb-6">Payment Information</h3>
        <div className="space-y-6">
          {/* USDC Wallet */}
          <div>
            <label className="block text-sm font-medium text-light/60 mb-1">
              External USDC Wallet Address (Ethereum)
            </label>
            <div className="flex items-center">
              {isEditingUSDC ? (
                <div className="flex-1">
                  <div className="flex items-center">
                    <Input
                      value={financialInfo.usdcWalletAddress}
                      onChange={(e) => setFinancialInfo(prev => ({
                        ...prev,
                        usdcWalletAddress: e.target.value
                      }))}
                      placeholder="0x..."
                      className="!bg-dark-2 w-[300px]"
                    />
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => setIsEditingUSDC(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="primary"
                      onClick={handleSaveFinancialInfo}
                      className="rounded-full px-8 py-1.5"
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="flex items-center">
                    <p className="text-light text-lg">
                      {formatWalletAddress(financialInfo.usdcWalletAddress)}
                    </p>
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => setIsEditingUSDC(true)}
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bank Account Info - Row */}
          <div className="flex gap-12">
            {/* Bank Account Number */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-light/60 mb-1">
                Bank Account Number
              </label>
              <div className="flex items-center">
                {isEditingBankAccount ? (
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Input
                        value={financialInfo.bankAccountNumber}
                        onChange={(e) => setFinancialInfo(prev => ({
                          ...prev,
                          bankAccountNumber: e.target.value
                        }))}
                        className="!bg-dark-2 w-[200px]"
                      />
                      <Button
                        variant="secondary"
                        className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                        onClick={() => setIsEditingBankAccount(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        onClick={handleSaveFinancialInfo}
                        className="rounded-full px-8 py-1.5"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-light text-lg">
                      {financialInfo.bankAccountNumber ? 
                        '••••' + financialInfo.bankAccountNumber.slice(-4) : 
                        'Not set'
                      }
                    </p>
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => setIsEditingBankAccount(true)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Routing Number */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-light/60 mb-1">
                Bank Routing Number
              </label>
              <div className="flex items-center">
                {isEditingRoutingNumber ? (
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Input
                        value={financialInfo.bankRoutingNumber}
                        onChange={(e) => setFinancialInfo(prev => ({
                          ...prev,
                          bankRoutingNumber: e.target.value
                        }))}
                        className="!bg-dark-2 w-[200px]"
                      />
                      <Button
                        variant="secondary"
                        className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                        onClick={() => setIsEditingRoutingNumber(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        onClick={handleSaveFinancialInfo}
                        className="rounded-full px-8 py-1.5"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <p className="text-light text-lg">
                      {financialInfo.bankRoutingNumber ? 
                        '••••' + financialInfo.bankRoutingNumber.slice(-4) : 
                        'Not set'
                      }
                    </p>
                    <Button
                      variant="secondary"
                      className="rounded-full px-6 py-1.5 bg-light/10 hover:bg-light/20 ml-2"
                      onClick={() => setIsEditingRoutingNumber(true)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-tertiary-pink text-sm">{error}</p>
      )}
    </div>
  );
};