import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const ProtectedLayout: React.FC = () => {
  const navigate = useNavigate();

  // TODO: Add auth check
  // const isAuthenticated = useAuth();
  // React.useEffect(() => {
  //   if (!isAuthenticated) {
  //     navigate('/');
  //   }
  // }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen bg-dark">
      {/* Sidebar Navigation */}
      <nav className="w-64 border-r border-light/10 p-4">
        <img 
          className="h-8 w-auto"
          src="https://pamfleeuofdmhzyohnjt.supabase.co/storage/v1/object/public/assets/logo-negative.png"
          alt="Landhoney"
        />
        <div className="space-y-2">
          {[
            { path: 'profile', label: 'Account' },
            { path: 'portfolio', label: 'Portfolio' },
            { path: 'invest', label: 'Invest' },
            { path: 'reserve', label: 'Liquid Reserve' },
          ].map(({ path, label }) => (
            <NavLink
              key={path}
              to={`/app/${path}`}
              className={({ isActive }) =>
                `block px-4 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary text-dark' 
                    : 'text-light hover:bg-light/10'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}; 