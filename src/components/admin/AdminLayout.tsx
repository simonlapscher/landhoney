import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { adminSupabase } from '../../lib/supabase';
import { checkAdminStatus } from '../../lib/adminAuth';

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
    <div className="min-h-screen bg-dark-1">
      <nav className="bg-dark-2 border-b border-dark-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-light">Admin Portal</span>
              </div>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => {
                  adminSupabase.auth.signOut();
                  navigate('/admin/login');
                }}
                className="text-light/60 hover:text-light"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}; 