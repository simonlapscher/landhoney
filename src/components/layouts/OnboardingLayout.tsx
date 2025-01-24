import React from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import { ProgressDots } from '../common/ProgressDots';
import { OnboardingProvider } from '../../contexts/OnboardingContext';
import { AnimatePresence, motion } from 'framer-motion';

export const OnboardingLayout: React.FC = () => {
  const location = useLocation();
  const showProgress = !location.pathname.includes('complete');

  return (
    <div className="min-h-screen bg-dark-900">
      <OnboardingProvider showProgress={showProgress}>
        <div className="flex flex-col min-h-screen">
          {showProgress && (
            <div className="flex justify-center pt-8">
              <ProgressDots />
            </div>
          )}
          <div className="flex-grow pt-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                style={{ position: 'absolute', width: '100%' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </OnboardingProvider>
    </div>
  );
}; 