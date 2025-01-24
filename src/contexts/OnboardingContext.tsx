import React, { createContext, useContext } from 'react';

type OnboardingContextType = {
  showProgress: boolean;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const OnboardingProvider: React.FC<{
  children: React.ReactNode;
  showProgress: boolean;
}> = ({ children, showProgress }) => {
  return (
    <OnboardingContext.Provider value={{ showProgress }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}; 