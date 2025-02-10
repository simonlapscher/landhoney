import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/context/AuthContext';

const navigationItems = [
  { name: 'Portfolio', href: '/app/portfolio' },
  { name: 'Invest', href: '/app/invest' },
  { name: 'Liquid Reserve', href: '/app/liquid-reserve' },
  // ... other items
];

export const AppLayout: React.FC = () => {
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
  );
}; 