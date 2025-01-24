import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

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
          src="/assets/images/Logo Negative.png" 
          alt="Landhoney" 
          className="h-8 mb-8"
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