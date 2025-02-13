import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
          throw new Error('No user found');
        }

        console.log('Verifying user:', user.id);

        // Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
          console.error('Profile fetch error:', fetchError);
          throw fetchError;
        }

        if (!existingProfile) {
          console.log('Creating new profile for user:', user.id);
          // Create new profile
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
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
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-dark rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return null;
}; 