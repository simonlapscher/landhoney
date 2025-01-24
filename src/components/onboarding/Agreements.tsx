import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export const Agreements: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agreements, setAgreements] = useState({
    terms: false,
    privacy: false,
    marketing: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement agreements submission
      await new Promise(resolve => setTimeout(resolve, 1000));
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
          Please review and accept our terms and policies
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.terms}
              onChange={() => handleChange('terms')}
              className="mt-1 text-primary focus:ring-primary"
            />
            <span className="text-light/80">
              I accept the <a href="/terms" target="_blank" className="text-primary hover:text-secondary-honey">Terms of Service</a>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.privacy}
              onChange={() => handleChange('privacy')}
              className="mt-1 text-primary focus:ring-primary"
            />
            <span className="text-light/80">
              I accept the <a href="/privacy" target="_blank" className="text-primary hover:text-secondary-honey">Privacy Policy</a>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={agreements.marketing}
              onChange={() => handleChange('marketing')}
              className="mt-1 text-primary focus:ring-primary"
            />
            <span className="text-light/80">
              I agree to receive marketing communications (optional)
            </span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!agreements.terms || !agreements.privacy}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 