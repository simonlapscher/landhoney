import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { IdentificationIcon } from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

export const TaxInfo: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [taxId, setTaxId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Insert into tax_information table
      // Note: The tax_id is stored as bytea, so we need to encode it properly
      const { error: taxError } = await supabase
        .from('tax_information')
        .insert({
          user_id: user.id,
          tax_id: taxId,  // Supabase will handle the text to bytea conversion
          created_at: new Date().toISOString()
        });

      if (taxError) throw taxError;

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
          autoComplete="off"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!taxId}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 