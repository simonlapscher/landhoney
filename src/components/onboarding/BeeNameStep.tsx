import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { DEFAULT_BEE_AVATAR } from '../../lib/constants';
import { styles } from '../../utils/styles';

export const BeeNameStep: React.FC = () => {
  const { user } = useAuth();
  const { nextStep } = useOnboarding();
  const [beeName, setBeeName] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_BEE_AVATAR);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkBeeName = async () => {
      if (!beeName) {
        setIsAvailable(null);
        return;
      }

      setIsChecking(true);
      try {
        const { data, error } = await supabase.rpc('check_bee_name_available', {
          p_bee_name: beeName
        });
        
        if (error) throw error;
        setIsAvailable(data);
        setError(data ? '' : 'Bee Name already taken. Choose a different one.');
      } catch (err) {
        console.error('Error checking bee name:', err);
        setError('Error checking bee name availability');
      } finally {
        setIsChecking(false);
      }
    };

    if (beeName) {
      timeoutId = setTimeout(checkBeeName, 500);
    }

    return () => clearTimeout(timeoutId);
  }, [beeName]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file || !user) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);

      await supabase.rpc('update_profile_avatar', {
        p_user_id: user.id,
        p_avatar_url: publicUrl
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !beeName || !isAvailable) return;

    try {
      const { error } = await supabase.rpc('update_profile_display_name', {
        p_user_id: user.id,
        p_display_name: beeName,
        p_bee_name: beeName
      });

      if (error) throw error;
      nextStep();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error updating profile');
    }
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-light">Choose Your Bee Name</h2>
      </div>
      
      <div className="flex flex-col items-center mb-4">
        <div className="relative w-24 h-24">
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-full h-full rounded-full object-cover"
          />
          <label className="absolute bottom-0 right-0 bg-primary hover:bg-primary/80 rounded-full p-2 cursor-pointer">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-dark"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div className="relative">
            <input
              type="text"
              value={beeName}
              onChange={(e) => setBeeName(e.target.value)}
              className={`w-full px-4 py-3 bg-[#1A1A1A] text-light rounded-lg border ${
                isAvailable ? 'border-green-500' : 'border-light/10'
              } focus:outline-none focus:ring-2 focus:ring-primary placeholder-light/40`}
              placeholder="Enter your Bee Name"
            />
            {beeName && !isChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isAvailable ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircleIcon className="w-5 h-5 text-red-500" />
                )}
              </div>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <p className="mt-2 text-sm text-light/60">
            Your Bee Name will be used publicly for the rewards leaderboard. Your financial positions or personal information will not be disclosed or attached to your Bee Name publicly.
          </p>
        </div>

        <button
          type="submit"
          disabled={!isAvailable || !beeName}
          className="w-full py-3 px-4 bg-primary hover:bg-primary/80 text-dark font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </form>
    </div>
  );
}; 