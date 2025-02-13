import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const url = window.location.href;
        console.log('Starting auth callback with URL:', url);
        
        // Check for hash parameters first (this is what we get from production)
        const hash = window.location.hash;
        console.log('URL hash:', hash);
        
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Auth params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type,
          rawHash: hash
        });

        if (!accessToken) {
          console.error('No access token found in URL');
          throw new Error('No access token found. Please try verifying your email again.');
        }

        // Set the session with the tokens from the hash
        console.log('Setting session with access token...');
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ''
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session?.user) {
          console.error('No user found in session after setting tokens');
          throw new Error('No user found in session. Please try signing in again.');
        }

        console.log('Session established for user:', session.user.id);

        // Check if profile exists
        console.log('Checking for existing profile...');
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
          throw new Error(`Profile fetch error: ${profileError.message}`);
        }

        if (!profile) {
          console.log('No profile found, creating new profile...');
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: session.user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) {
            console.error('Profile creation error:', createError);
            throw new Error(`Profile creation error: ${createError.message}`);
          }
          console.log('Profile created successfully');
        } else {
          console.log('Existing profile found');
        }

        // Update user metadata
        console.log('Updating user metadata...');
        const { error: updateError } = await supabase.auth.updateUser({
          data: { needs_profile_creation: false }
        });

        if (updateError) {
          console.error('Error updating user metadata:', updateError);
          // Don't throw here, just log the error as this is not critical
        }

        // Redirect to the next step
        console.log('All steps completed, redirecting to country selection');
        navigate('/onboarding/country');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred during verification');
        setDetails(err instanceof Error ? err.stack || null : null);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-[#FFD700] text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-4">Verification Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-[#FFD700] text-black font-medium rounded-lg hover:bg-[#E6C200] transition-colors"
            >
              Try Again
            </button>
            <a
              href="/"
              className="block w-full py-3 px-4 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </a>
            {details && (
              <div className="mt-4 p-4 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-400 text-left whitespace-pre-wrap font-mono">
                  {details}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700] mx-auto"></div>
        <p className="mt-4 text-white">Verifying your account...</p>
      </div>
    </div>
  );
}; 