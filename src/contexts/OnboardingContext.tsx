import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingContextType {
  currentStep: number;
  nextStep: () => void;
  prevStep: () => void;
  showProgress: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
  children: React.ReactNode;
  showProgress: boolean;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children, showProgress }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const navigate = useNavigate();

  const nextStep = () => {
    const nextStepNumber = currentStep + 1;
    setCurrentStep(nextStepNumber);
    
    // Map step numbers to routes
    const stepRoutes: Record<number, string> = {
      1: '/onboarding/verify',
      2: '/onboarding/bee-name',
      3: '/onboarding/country',
      4: '/onboarding/phone',
      5: '/onboarding/tax-info',
      6: '/onboarding/agreements',
      7: '/onboarding/complete'
    };

    if (stepRoutes[nextStepNumber]) {
      navigate(stepRoutes[nextStepNumber]);
    }
  };

  const prevStep = () => {
    const prevStepNumber = currentStep - 1;
    setCurrentStep(prevStepNumber);
    
    const stepRoutes: Record<number, string> = {
      1: '/onboarding/verify',
      2: '/onboarding/bee-name',
      3: '/onboarding/country',
      4: '/onboarding/phone',
      5: '/onboarding/tax-info',
      6: '/onboarding/agreements'
    };

    if (stepRoutes[prevStepNumber]) {
      navigate(stepRoutes[prevStepNumber]);
    }
  };

  return (
    <OnboardingContext.Provider value={{ currentStep, nextStep, prevStep, showProgress }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}; 