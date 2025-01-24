import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

export const PhoneInput: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // TODO: Store phone number in user metadata
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/onboarding/tax-info');
    } catch (error) {
      console.error('Error saving phone number:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <DevicePhoneMobileIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Add Your Phone</h2>
        <p className="text-light/80 mt-2">
          Enter your phone number to receive important updates
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="tel"
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 555-5555"
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
          disabled={!phone}
        >
          Continue
        </Button>
      </form>
    </div>
  );
}; 