import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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

// Map routes to step numbers
const routeStepMap: Record<string, number> = {
  '/onboarding/verify': 1,
  '/onboarding/bee-name': 2,
  '/onboarding/country': 3,
  '/onboarding/phone': 4,
  '/onboarding/tax-info': 5,
  '/onboarding/agreements': 6,
  '/onboarding/complete': 7
};

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children, showProgress }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(() => {
    // Initialize with the correct step based on current route
    return routeStepMap[location.pathname] || 1;
  });

  // Keep currentStep in sync with route changes
  useEffect(() => {
    const stepForRoute = routeStepMap[location.pathname];
    if (stepForRoute && stepForRoute !== currentStep) {
      setCurrentStep(stepForRoute);
    }
  }, [location.pathname]);

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
      console.log('Navigating to next step:', stepRoutes[nextStepNumber]);
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
      console.log('Navigating to previous step:', stepRoutes[prevStepNumber]);
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