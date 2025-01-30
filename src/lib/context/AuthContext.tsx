import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  originalSession: Session | null;
  originalUser: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  originalSession: null,
  originalUser: null,
  isLoading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [originalSession, setOriginalSession] = useState<Session | null>(() => {
    const stored = localStorage.getItem('originalSession');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Function to safely set original session
  const setOriginalSessionWithStorage = (newSession: Session | null) => {
    if (newSession) {
      localStorage.setItem('originalSession', JSON.stringify(newSession));
    } else {
      localStorage.removeItem('originalSession');
    }
    setOriginalSession(newSession);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      console.log('Initial auth session:', {
        email: initialSession?.user?.email,
        id: initialSession?.user?.id
      });
      
      setSession(initialSession);
      
      // Only set original session if we don't have one stored
      const storedSession = localStorage.getItem('originalSession');
      if (!storedSession && initialSession) {
        console.log('Setting original session:', {
          email: initialSession.user?.email,
          id: initialSession.user?.id
        });
        setOriginalSessionWithStorage(initialSession);
      }
      
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('Auth state changed:', {
        event: _event,
        email: newSession?.user?.email,
        id: newSession?.user?.id,
        hasOriginalSession: !!originalSession
      });
      
      setSession(newSession);
      
      // Set original session if we don't have one and this is a new sign in
      const storedSession = localStorage.getItem('originalSession');
      if (!storedSession && newSession && _event === 'SIGNED_IN') {
        console.log('Setting original session from auth change:', {
          email: newSession.user?.email,
          id: newSession.user?.id
        });
        setOriginalSessionWithStorage(newSession);
      }

      // Clear original session on sign out
      if (_event === 'SIGNED_OUT') {
        setOriginalSessionWithStorage(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove originalSession dependency since we're using localStorage

  const value = {
    session,
    user: session?.user ?? null,
    originalSession,
    originalUser: originalSession?.user ?? null,
    isLoading,
  };

  console.log('Auth context value:', {
    currentUser: value.user?.email,
    originalUser: value.originalUser?.email,
    isLoading
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 