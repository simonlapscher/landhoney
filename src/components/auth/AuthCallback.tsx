import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the URL parameters
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const type = params.get('type');
        
        console.log('Auth callback params:', { hasToken: !!token, type });

        if (!token) {
          throw new Error('No token found in URL');
        }

        // Handle the token verification
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: type as any || 'signup'
        });

        if (verifyError) throw verifyError;

        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) throw new Error('No user found after verification');

        // Create profile if needed
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (!profile) {
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: session.user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

          if (createError) throw createError;
        }

        // Update user metadata
        await supabase.auth.updateUser({
          data: { needs_profile_creation: false }
        });

        // Redirect to the next step
        navigate('/onboarding/country');
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred during verification');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-light mb-2">Verification Error</h2>
          <p className="text-light/60">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-dark rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-light">Verifying your account...</p>
      </div>
    </div>
  );
}; 