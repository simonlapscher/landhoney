import React from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const ProgressDots: React.FC = () => {
  const { currentStep } = useOnboarding();
  const totalSteps = 6; // Excluding completion step

  return (
    <div className="flex space-x-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`w-2 h-2 rounded-full transition-colors duration-200 ${
            index + 1 === currentStep
              ? 'bg-primary'
              : index + 1 < currentStep
              ? 'bg-primary/60'
              : 'bg-light/20'
          }`}
        />
      ))}
    </div>
  );
}; 