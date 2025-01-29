import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { styles } from '../../utils/styles';
import { UserIcon } from '@heroicons/react/24/outline';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Check if user has admin privileges
      if (data.user.user_metadata?.is_admin) {
        navigate('/admin/transactions');
      } else {
        navigate('/app/portfolio');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    navigate('/onboarding/create-account');
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <UserIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Welcome Back</h2>
        <p className="text-light/80 mt-2">
          Sign in to your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          type="email"
          name="email"
          label="Email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />

        <Input
          type="password"
          name="password"
          label="Password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        {error && (
          <p className="text-tertiary-pink text-sm">{error}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={loading}
        >
          Sign In
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={handleCreateAccount}
            className="text-light/60 hover:text-light text-sm"
          >
            Don't have an account? Create one
          </button>
        </div>
      </form>
    </div>
  );
}; 