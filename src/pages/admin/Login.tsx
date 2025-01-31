import React, { useState } from 'react';
import { adminSupabase } from '../../lib/supabase';
import { checkAdminStatus } from '../../lib/adminAuth';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';

export const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Starting admin login process...');
      
      // First, try to sign in using admin client
      console.log('Attempting admin sign in with:', email);
      const { data: authData, error: signInError } = await adminSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Admin sign in error:', signInError);
        throw signInError;
      }
      
      console.log('Admin auth response:', {
        user: authData.user ? {
          id: authData.user.id,
          email: authData.user.email,
          metadata: authData.user.user_metadata
        } : null,
        session: authData.session ? 'exists' : 'none'
      });

      if (!authData.user) {
        console.error('No admin user data returned');
        throw new Error('No user data returned');
      }

      // Check if user is admin
      console.log('Checking admin status...');
      const isAdmin = await checkAdminStatus();
      console.log('Admin check result:', isAdmin);
      
      if (!isAdmin) {
        console.error('User is not an admin');
        throw new Error('Unauthorized access');
      }

      console.log('Admin login successful, navigating to admin dashboard...');
      navigate('/admin/transactions');
    } catch (err) {
      console.error('Admin login error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-1 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="text-center text-3xl font-bold text-light">
            Admin Portal
          </h2>
          <p className="mt-2 text-center text-sm text-light/60">
            Sign in to access the admin dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            loading={loading}
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}; 