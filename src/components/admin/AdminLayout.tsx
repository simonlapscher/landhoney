import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { adminSupabase } from '../../lib/supabase';
import { checkAdminStatus } from '../../lib/adminAuth';
import { 
  ClockIcon, 
  CurrencyDollarIcon, 
  BanknotesIcon,
  DocumentCheckIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

const menuItems = [
  { path: 'transactions', label: 'Pending Transactions', icon: ClockIcon },
  { path: 'prices', label: 'Price Management', icon: CurrencyDollarIcon },
  { path: 'loans', label: 'Loan Distribution', icon: BanknotesIcon },
  { path: 'payouts', label: 'Payout History', icon: DocumentCheckIcon },
  { path: 'mint', label: 'Token Minting', icon: UserPlusIcon },
  { path: 'add-asset', label: 'Add Asset', icon: BanknotesIcon },
  { path: 'referrals', label: 'Referrals', icon: BanknotesIcon }
];

export const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const { data: { user } } = await adminSupabase.auth.getUser();
        
        if (!user) {
          navigate('/admin/login');
          return;
        }

        const isAdmin = await checkAdminStatus();
        
        if (!isAdmin) {
          navigate('/admin/login');
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error verifying admin status:', err);
        navigate('/admin/login');
      }
    };

    verifyAdmin();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-1">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-1 flex">
      {/* Side Menu */}
      <div className="w-64 bg-dark-2 border-r border-dark-3 fixed h-screen">
        <div className="p-6">
          <h1 className="text-xl font-bold text-light">Admin Portal</h1>
        </div>
        
        <nav className="mt-6 px-4 space-y-4">
          {menuItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/admin/${path}`);
              }}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-dark'
                    : 'text-light/60 hover:text-light hover:bg-dark-3'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => {
              adminSupabase.auth.signOut();
              navigate('/admin/login');
            }}
            className="flex items-center space-x-3 px-4 py-3 rounded-lg w-full text-left text-light/60 hover:text-light hover:bg-dark-3 transition-colors mt-8"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span>Sign out</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <main className="max-w-7xl mx-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}; 