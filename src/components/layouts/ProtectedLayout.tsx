import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { 
  UserCircleIcon, 
  BanknotesIcon, 
  WalletIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';

export const ProtectedLayout: React.FC = () => {
  const navigate = useNavigate();

  // TODO: Add auth check
  // const isAuthenticated = useAuth();
  // React.useEffect(() => {
  //   if (!isAuthenticated) {
  //     navigate('/');
  //   }
  // }, [isAuthenticated, navigate]);

  const menuItems = [
    { path: 'profile', label: 'Account', icon: UserCircleIcon },
    { path: 'invest', label: 'Invest', icon: BanknotesIcon },
    { path: 'portfolio', label: 'My Assets', icon: WalletIcon },
    { path: 'reserve', label: 'Liquid Reserve', icon: BeakerIcon },
  ];

  return (
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
  );
}; 