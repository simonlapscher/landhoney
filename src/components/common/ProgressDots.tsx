import React from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboarding } from '../../contexts/OnboardingContext';

const ONBOARDING_STEPS = [
  '/onboarding/create-account',
  '/onboarding/country',
  '/onboarding/phone',
  '/onboarding/tax-info',
  '/onboarding/agreements',
  '/onboarding/complete'
];

export const ProgressDots: React.FC = () => {
  const location = useLocation();
  const { showProgress } = useOnboarding();

  if (!showProgress) return null;

  const currentIndex = ONBOARDING_STEPS.indexOf(location.pathname);

  return (
    <div className="flex space-x-2 pt-6">
      {ONBOARDING_STEPS.map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full ${
            index <= currentIndex ? 'bg-primary' : 'bg-light/20'
          }`}
          data-testid={`progress-dot-${index}`}
        />
      ))}
    </div>
  );
}; 