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
}

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

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
      setError(null);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDisplayName = async () => {
    try {
      if (!profile?.user_id) return;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      await fetchProfile();
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating display name:', error);
      setError('Failed to update display name. Please try again.');
    }
  };

  const handleSaveEmail = async () => {
    try {
      if (!profile?.user_id) return;

      const { error: updateError } = await supabase.auth.updateUser({
        email: email
      });

      if (updateError) throw updateError;

      await fetchProfile();
      setIsEditingEmail(false);
    } catch (error) {
      console.error('Error updating email:', error);
      setError('Failed to update email. Please try again.');
    }
  };

  const handleSavePhone = async () => {
    try {
      if (!profile?.user_id) return;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone: phone })
        .eq('user_id', profile.user_id);

      if (updateError) throw updateError;

      await fetchProfile();
      setIsEditingPhone(false);
    } catch (error) {
      console.error('Error updating phone:', error);
      setError('Failed to update phone number. Please try again.');
    }
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
          <div className="relative">
            <img
              src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/honeycito.png"
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border border-light/20"
            />
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
                      size="sm"
                      onClick={handleSaveDisplayName}
                      className="rounded-full px-8 py-2"
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
                      className="!bg-dark-2 w-64"
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
                      size="sm"
                      onClick={handleSaveEmail}
                      className="rounded-full px-8 py-2"
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
                      className="!bg-dark-2 w-64"
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
                      size="sm"
                      onClick={handleSavePhone}
                      className="rounded-full px-8 py-2"
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

      {error && (
        <p className="mt-4 text-tertiary-pink text-sm">{error}</p>
      )}
    </div>
  );
};