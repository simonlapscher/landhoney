import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('Starting auth callback with URL:', window.location.href);
        
        // Check for hash parameters first (this is what we get from production)
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('Auth params:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          type
        });

        if (accessToken) {
          // Set the session with the tokens from the hash
          const { data: { session }, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (sessionError) {
            console.error('Session error:', sessionError);
            throw sessionError;
          }

          if (!session?.user) {
            console.error('No user found in session');
            throw new Error('No user found in session');
          }

          console.log('Session established for user:', session.user.id);

          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('Profile fetch error:', profileError);
            throw profileError;
          }

          if (!profile) {
            console.log('Creating new profile for user:', session.user.id);
            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                user_id: session.user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (createError) {
              console.error('Profile creation error:', createError);
              throw createError;
            }
          }

          // Update user metadata
          const { error: updateError } = await supabase.auth.updateUser({
            data: { needs_profile_creation: false }
          });

          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          }

          // Redirect to the next step
          console.log('Redirecting to country selection');
          navigate('/onboarding/country');
        } else {
          throw new Error('No authentication tokens found in URL');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred during verification');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-light mb-2">Verification Error</h2>
          <p className="text-light/60">{error}</p>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-dark rounded-lg hover:bg-primary/90"
            >
              Try Again
            </button>
            <p className="text-sm text-light/60">
              If the error persists, please request a new verification email.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-light">Verifying your account...</p>
      </div>
    </div>
  );
}; 