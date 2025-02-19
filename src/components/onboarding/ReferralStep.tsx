import React, { useState } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { supabase } from '../../lib/supabase';

export const ReferralStep: React.FC = () => {
  const { nextStep } = useOnboarding();
  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (referralCode.trim()) {
        // Store the referral code
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            used_referral_code: referralCode.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

        if (updateError) throw updateError;
      }

      // Move to next step regardless of whether a code was entered
      nextStep();
    } catch (err) {
      console.error('Error saving referral code:', err);
      setError('Failed to save referral code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    nextStep();
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <h1 className="text-2xl font-bold text-center mb-2">Got a Referral Code?</h1>
      <p className="text-light/60 text-center mb-8">
        Enter your referral code if you have one. This step is optional.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Enter referral code"
            className="w-full px-4 py-3 bg-[#2A2A2A] rounded-lg text-light placeholder-light/40 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && (
            <p className="mt-2 text-red-500 text-sm">{error}</p>
          )}
        </div>

        <div className="space-y-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-dark font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-3 bg-transparent text-light/60 font-medium rounded-lg hover:text-light transition-colors"
          >
            Skip
          </button>
        </div>
      </form>
    </div>
  );
}; 