import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

export const Agreements: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agreements, setAgreements] = useState({
    terms_accepted: false,
    privacy_accepted: false,
    marketing_accepted: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          terms_accepted: agreements.terms_accepted,
          privacy_accepted: agreements.privacy_accepted,
          marketing_accepted: agreements.marketing_accepted,
          agreements_date: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      navigate('/onboarding/complete');
    } catch (error) {
      console.error('Error submitting agreements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name: keyof typeof agreements) => {
    setAgreements(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <ClipboardDocumentCheckIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Legal Agreements</h2>
        <p className="text-light/80 mt-2">
          Almost done! Review and accept our terms and policies
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.terms_accepted}
              onChange={() => handleChange('terms_accepted')}
              className="min-w-[20px] min-h-[20px] w-5 h-5 text-primary focus:ring-primary rounded border-light/20"
            />
            <span className="text-light/80">
              I accept the <a href="/terms" target="_blank" className="text-primary hover:text-secondary-honey">Terms of Service</a>
              <span className="text-tertiary-pink ml-1">*</span>
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.privacy_accepted}
              onChange={() => handleChange('privacy_accepted')}
              className="min-w-[20px] min-h-[20px] w-5 h-5 text-primary focus:ring-primary rounded border-light/20"
            />
            <span className="text-light/80">
              I accept the <a href="/privacy" target="_blank" className="text-primary hover:text-secondary-honey">Privacy Policy</a>
              <span className="text-tertiary-pink ml-1">*</span>
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.marketing_accepted}
              onChange={() => handleChange('marketing_accepted')}
              className="min-w-[20px] min-h-[20px] w-5 h-5 text-primary focus:ring-primary rounded border-light/20"
            />
            <span className="flex-1 text-light whitespace-nowrap">
              I want to receive occassional exciting announcements and company updates <span className="text-light/60 ml-1">(optional)</span>
            </span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!agreements.terms_accepted || !agreements.privacy_accepted}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 