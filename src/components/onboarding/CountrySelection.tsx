import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { Select } from '../common/Select';

const COUNTRIES = [
  { value: '', label: 'Select your country' },
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'gb', label: 'United Kingdom' },
  // Add more countries as needed
];

export const CountrySelection: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Implement country submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/onboarding/phone');
    } catch (error) {
      console.error('Error submitting country:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <GlobeAltIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Select Your Country</h2>
        <p className="text-light/80 mt-2">
          Choose your country of residence
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Select
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          options={COUNTRIES}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!country}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 