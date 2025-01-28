import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../common/Button';
import { styles } from '../../utils/styles';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { sendWelcomeEmail } from '../../lib/auth';

export const Completion: React.FC = () => {
  const navigate = useNavigate();
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    const sendEmail = async () => {
      const { success, error } = await sendWelcomeEmail();
      if (!success && error) {
        setEmailError(error);
      }
    };
    sendEmail();
  }, []);

  return (
    <div className={`${styles.container} space-y-8 pt-32`}>
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-6">
          <CheckCircleIcon className="w-16 h-16 text-primary animate-bounce" />
        </div>
        <h2 className="text-2xl font-bold text-light">Welcome to Landhoney!</h2>
        <p className="text-light/80">
          Your account has been successfully created
        </p>
        {emailError && (
          <div className="flex items-center justify-center gap-2 text-tertiary-pink">
            <ExclamationCircleIcon className="w-5 h-5" />
            <p className="text-sm">There was an issue sending your welcome email. Please contact support if needed.</p>
          </div>
        )}
        <h3 className="text-3xl font-bold text-primary mt-8">
          Ready to build real wealth?
        </h3>
      </div>

      <div className="space-y-4">
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => navigate('/app/invest')}
        >
          Start Investing
        </Button>
      </div>
    </div>
  );
}; 