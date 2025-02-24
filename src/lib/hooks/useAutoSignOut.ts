import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const TIMEOUT_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

export const useAutoSignOut = () => {
  const navigate = useNavigate();
  const [lastActivity, setLastActivity] = useState(Date.now());

  const resetTimer = () => {
    setLastActivity(Date.now());
  };

  useEffect(() => {
    // Events to track user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart'
    ];

    // Update last activity time when user performs any action
    const updateLastActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, updateLastActivity);
    });

    // Check for inactivity every minute
    const interval = setInterval(async () => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivity;

      if (timeSinceLastActivity >= TIMEOUT_DURATION) {
        // Sign out user
        await supabase.auth.signOut();
        toast('Signed out due to inactivity', {
          icon: '⏰'
        });
        navigate('/onboarding/login');
      }
    }, 60000); // Check every minute

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateLastActivity);
      });
      clearInterval(interval);
    };
  }, [lastActivity, navigate]);

  return resetTimer;
}; 