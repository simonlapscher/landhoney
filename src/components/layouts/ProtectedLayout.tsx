import React from 'react';
import { Outlet, NavLink, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  UserCircleIcon, 
  BanknotesIcon, 
  WalletIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../lib/context/AuthContext';

export const ProtectedLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  console.log('ProtectedLayout State:', {
    path: location.pathname,
    isLoading,
    hasUser: !!user,
    userId: user?.id,
    timestamp: new Date().toISOString()
  });

  if (isLoading) {
    console.log('ProtectedLayout: Loading...', location.pathname);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-light"></div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedLayout: No user, redirecting from:', location.pathname);
    return <Navigate to="/onboarding/login" state={{ from: location.pathname }} />;
  }

  console.log('ProtectedLayout: Rendering protected content');

  const menuItems = [
    { path: 'profile', label: 'Account', icon: UserCircleIcon },
    { path: 'invest', label: 'Invest', icon: BanknotesIcon },
    { path: 'portfolio', label: 'My Assets', icon: WalletIcon },
    { path: 'liquid-reserve', label: 'Liquid Reserve', icon: BeakerIcon },
  ];

  return (
    <div>
      <div className="flex min-h-screen bg-dark">
        {/* Sidebar Navigation */}
        <nav className="w-72 border-r border-light/10 p-8 fixed h-screen overflow-y-auto">
          <div className="pl-4">
            <img 
              className="h-8 w-auto mb-6"
              src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/logo-negative.png"
              alt="Landhoney"
            />
          </div>
          <div className="space-y-3">
            {menuItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={`/app/${path}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/app/${path}`);
                }}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-2xl transition-colors text-lg font-medium ${
                    isActive 
                      ? 'bg-[#FFF184]/10 text-[#FFF184]' 
                      : 'text-light hover:bg-light/5'
                  }`
                }
              >
                <Icon className="w-6 h-6 mr-3" />
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 pl-72 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}; 