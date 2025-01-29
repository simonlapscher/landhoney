import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const EmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        
        if (!user) {
          throw new Error('No user found');
        }

        // Check if user needs profile creation
        if (user.user_metadata?.needs_profile_creation) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            throw profileError;
          }

          // Update user metadata to remove the flag
          const { error: updateError } = await supabase.auth.updateUser({
            data: { needs_profile_creation: false }
          });

          if (updateError) {
            console.error('Error updating user metadata:', updateError);
          }
        }

        // Redirect to country selection
        navigate('/onboarding/country');
      } catch (err) {
        console.error('Verification error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred during verification');
      }
    };

    handleEmailVerification();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-tertiary-pink mb-4">Verification Error</h2>
          <p className="text-light/80">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-primary mb-4">Verifying your email...</h2>
        <p className="text-light/80">Please wait while we complete your registration.</p>
      </div>
    </div>
  );
}; 