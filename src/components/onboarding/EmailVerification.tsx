import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/context/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabaseClient';

export const EmailVerificationStep: React.FC = () => {
  const { user } = useAuth();
  const { nextStep } = useOnboarding();
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkEmailVerification = async () => {
      if (!user) return;

      try {
        const { data: { user: currentUser }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        if (currentUser?.email_confirmed_at) {
          setIsVerified(true);
          handleVerificationSuccess();
        }
      } catch (err) {
        console.error('Error checking email verification:', err);
        setError('Failed to check email verification status');
      }
    };

    const interval = setInterval(checkEmailVerification, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const handleVerificationSuccess = async () => {
    try {
      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { needs_profile_creation: false }
      });

      if (updateError) {
        console.error('Error updating user metadata:', updateError);
      }

      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;
      if (!session?.user) throw new Error('No user found after verification');

      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Profile fetch error:', fetchError);
        throw fetchError;
      }

      if (!existingProfile) {
        console.log('Creating new profile');
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: session.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Profile creation error:', insertError);
          throw insertError;
        }
      }

      // Use the onboarding context to move to the next step (bee name)
      nextStep();
    } catch (err) {
      console.error('Error in verification success:', err);
      setError('Failed to complete verification process');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <h1 className="text-2xl font-bold text-center mb-8">Verify Your Email</h1>
      
      {error ? (
        <p className="text-red-500 text-center">{error}</p>
      ) : isVerified ? (
        <p className="text-green-500 text-center">Email verified! Redirecting...</p>
      ) : (
        <div className="text-center">
          <p className="mb-4">We've sent a verification link to your email.</p>
          <p className="text-sm text-light/60">
            Please check your inbox and click the verification link to continue.
          </p>
        </div>
      )}
    </div>
  );
}; 