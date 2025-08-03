import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Adjust the path if necessary
import { toast } from 'sonner';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Auto logout after 30 minutes of inactivity
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  const logout = async () => {
    try {
      await signOut(auth);
      // Clear any stored data
      localStorage.removeItem('selectedOrganizationId');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    // Track various user activities
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, []);

  // Check for inactivity
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      if (currentUser && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
        toast.info('Vous avez été déconnecté pour inactivité');
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInactivity);
  }, [currentUser, lastActivity]);

  useEffect(() => {
    console.log('AuthProvider useEffect running');
    try {
      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        console.log('Auth state changed:', user);
        setCurrentUser(user);
        setLoading(false);
      });

      // Cleanup subscription on unmount
      return unsubscribe;
    } catch (error) {
      console.error('Error in AuthProvider useEffect:', error);
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    loading,
    logout,
  };

  console.log('AuthProvider rendering, loading:', loading);

  // Always render children, but provide loading state
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 