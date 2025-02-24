import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/context/AuthContext';
import { Helmet } from 'react-helmet-async';

const navigationItems = [
  { name: 'Portfolio', href: '/app/portfolio' },
  { name: 'Invest', href: '/app/invest' },
  { name: 'Liquid Reserve', href: '/app/liquid-reserve' },
  // ... other items
];

export const AppLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  console.log('AppLayout Navigation:', {
    currentPath: location.pathname,
    isAuthenticated: !!user,
    userId: user?.id
  });

  const handleNavigation = (href: string) => {
    console.log('Navigation clicked:', {
      href,
      currentPath: location.pathname,
      isAuthenticated: !!user
    });
  };

  return (
    <>
      <Helmet>
        <title>Landhoney</title>
        <meta name="description" content="Invest in real estate assets that pay you" />
        
        {/* Open Graph meta tags */}
        <meta property="og:title" content="Landhoney" />
        <meta property="og:description" content="Invest in real estate assets that pay you" />
        <meta property="og:image" content="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets//logo-positive.png" />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Landhoney" />
        <meta name="twitter:description" content="Invest in real estate assets that pay you" />
        <meta name="twitter:image" content="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets//logo-positive.png" />
      </Helmet>

      <nav className="bg-secondary">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => handleNavigation(item.href)}
            className={`px-4 py-2 text-light hover:text-light/80 ${
              location.pathname === item.href ? 'font-bold' : ''
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>
      {children}
    </>
  );
}; 