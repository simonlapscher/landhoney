import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { IdentificationIcon } from '@heroicons/react/24/outline';

export const TaxInfo: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [taxId, setTaxId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement tax info submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/onboarding/agreements');
    } catch (error) {
      console.error('Error submitting tax info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <IdentificationIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Tax Information</h2>
        <p className="text-light/80 mt-2">
          Please provide your Social Security or tax identification number. We will use this to create your tax documents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="text"
          label="Tax ID or Social Security Number"
          value={taxId}
          onChange={(e) => setTaxId(e.target.value)}
          placeholder="Enter your tax ID"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 