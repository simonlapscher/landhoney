import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  originalUser?: User | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  originalUser: null
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [originalUser, setOriginalUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('AuthProvider: Initializing');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('AuthProvider: Got session', {
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        if (mounted) {
          setUser(session?.user ?? null);
          setOriginalUser(session?.user ?? null);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', {
          event,
          userId: session?.user?.id
        });
        
        if (mounted) {
          setUser(session?.user ?? null);
          setOriginalUser(session?.user ?? null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isLoading,
    originalUser
  };

  console.log('AuthProvider state:', {
    hasUser: !!user,
    isLoading,
    userId: user?.id
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 