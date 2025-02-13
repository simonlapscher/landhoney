import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Check for error in hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get('error')) {
          throw new Error(hashParams.get('error_description') || 'Verification failed');
        }

        // Get token from URL
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get('token');
        
        if (!token) {
          console.error('No token found in URL');
          throw new Error('Verification link is invalid or has expired');
        }

        console.log('Starting verification process');

        // Verify the token
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });

        if (verifyError) {
          console.error('Verification error:', verifyError);
          throw verifyError;
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session?.user) {
          throw new Error('No user found after verification');
        }

        console.log('User verified:', session.user.id);

        // Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
          console.error('Profile fetch error:', fetchError);
          throw fetchError;
        }

        if (!existingProfile) {
          console.log('Creating new profile for user:', session.user.id);
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: session.user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (insertError) {
            console.error('Profile creation error:', insertError);
            throw new Error('Failed to create profile');
          }
        }

        // Update user metadata to remove the flag
        const { error: updateError } = await supabase.auth.updateUser({
          data: { needs_profile_creation: false }
        });

        if (updateError) {
          console.error('Error updating user metadata:', updateError);
          // Don't throw here, as profile is already created
        }

        // Redirect to country selection
        navigate('/onboarding/country');
      } catch (error) {
        console.error('Email verification error:', error);
        setError(error instanceof Error ? error.message : 'An error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    handleEmailVerification();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-light">Verifying your email...</p>
        </div>
      </div>
    );
  }

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

  return null;
}; 