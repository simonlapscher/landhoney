import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { supabase } from '../../lib/supabase';
import { styles } from '../../utils/styles';
import { UserIcon } from '@heroicons/react/24/outline';

export const CreateAccount: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('All fields are required');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Get the current origin for the correct environment
      const currentOrigin = window.location.origin;
      const redirectTo = `${currentOrigin}/onboarding/verify#`;
      console.log('Redirect URL:', redirectTo);
      
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            needs_profile_creation: true
          }
        }
      });

      if (signUpError) {
        console.error('Signup Error Details:', signUpError);
        throw signUpError;
      }

      setSuccess(true);
    } catch (err: any) {
      console.error('Full Error:', err);
      setError(err.message || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.container} space-y-6`}>
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <UserIcon className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-light">Create Your Account</h2>
        <p className="text-light/80 mt-2">
          Enter your email and create a password
        </p>
      </div>

      {success ? (
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-primary">Check Your Email</h3>
          <p className="text-light/80">
            We've sent a confirmation link to <span className="font-medium">{formData.email}</span>.
            Please check your email and click the link to continue.
          </p>
          <p className="text-light/60 text-sm">
            Don't see the email? Check your spam folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="email"
            name="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <Input
            type="password"
            name="password"
            label="Password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="new-password"
          />

          <Input
            type="password"
            name="confirmPassword"
            label="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            autoComplete="new-password"
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
            Continue
          </Button>
        </form>
      )}
    </div>
  );
}; 