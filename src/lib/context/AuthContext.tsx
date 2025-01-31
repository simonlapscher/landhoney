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
      
      // Only set original session if we don't have one stored and we're not in admin portal
      const storedSession = localStorage.getItem('originalSession');
      const isAdminEmail = initialSession?.user?.email?.endsWith('@landhoney.io');
      const isAdminPath = window.location.pathname.startsWith('/admin');
      
      if (!storedSession && initialSession && !isAdminEmail && !isAdminPath) {
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
      
      // Handle different auth events
      switch (_event) {
        case 'SIGNED_IN': {
          const isAdminEmail = newSession?.user?.email?.endsWith('@landhoney.io');
          const isAdminPath = window.location.pathname.startsWith('/admin');
          const storedSession = localStorage.getItem('originalSession');

          // If it's a new user session (not admin) and we don't have a stored session
          if (!isAdminEmail && !isAdminPath && !storedSession) {
            console.log('Setting original session from new sign in:', {
              email: newSession?.user?.email,
              id: newSession?.user?.id
            });
            setOriginalSessionWithStorage(newSession);
          }
          break;
        }
        case 'SIGNED_OUT': {
          // Only clear original session if we're not in admin portal
          if (!window.location.pathname.startsWith('/admin')) {
            setOriginalSessionWithStorage(null);
          }
          break;
        }
        case 'USER_UPDATED': {
          // Update the current session but preserve original session
          setSession(newSession);
          break;
        }
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