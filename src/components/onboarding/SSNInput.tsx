import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { styles } from '../../utils/styles';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { PageTransition } from '../common/PageTransition';

export const SSNInput: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssn, setSSN] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ tax_id: ssn })
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      navigate('/onboarding/next-step'); // Replace with your next route
    } catch (err) {
      console.error('SSN update error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/onboarding/next-step'); // Replace with your next route
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col">
        <div className="flex-grow flex items-center justify-center">
          <div className={`${styles.container} space-y-6`}>
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <ShieldCheckIcon className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-light">
                Social Security Number or Tax ID
              </h2>
              <p className="text-light/80 mt-2">
                We need your SSN for tax reporting purposes
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                type="text"
                name="ssn"
                label="Social Security Number or Tax ID"
                value={ssn}
                onChange={(e) => setSSN(e.target.value)}
                placeholder="XXX-XX-XXXX"
                autoComplete="off"
              />

              {error && (
                <p className="text-tertiary-pink text-sm">{error}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={loading}
              >
                Continue
              </Button>

              <div className="space-y-2">
                <p className="text-light/80 text-sm text-center">
                  We will use this information to share your tax documents
                </p>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="w-full text-light/60 hover:text-light text-sm"
                >
                  Skip for Now
                </button>
                <p className="text-light/60 text-sm text-center">
                  You can always add this information later in your profile settings
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SSNInput; 