import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { styles } from '../../utils/styles';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGetStarted = () => {
    navigate('/onboarding/create-account');
  };

  const handleLogin = () => {
    navigate('/onboarding/login');
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4">
      <div className={`${styles.container} transition-all duration-700 ease-out transform
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="space-y-8 text-center">
          <img 
            src="/assets/images/logo-negative.png"
            alt="Landhoney" 
            className={`mx-auto h-12 transition-all duration-700 delay-300 transform
              ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
          />
          
          <div className={`space-y-3 transition-all duration-700 delay-500 transform
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <h1 className="text-4xl font-bold text-light">
              Welcome to Landhoney
            </h1>
            <p className="text-xl text-light/80">
              Invest in real assets that pay you, from $1
            </p>
          </div>

          <div className={`space-y-4 transition-all duration-700 delay-700 transform
            ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <button
              onClick={handleGetStarted}
              className="w-full bg-primary text-dark font-bold py-3 px-6 rounded-xl hover:bg-secondary-honey transition-colors"
            >
              Get Started
            </button>
            <button
              onClick={handleLogin}
              className="w-full bg-light/10 text-light font-bold py-3 px-6 rounded-xl hover:bg-light/20 transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 