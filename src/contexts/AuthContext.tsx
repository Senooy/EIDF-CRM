import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Adjust the path if necessary

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
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
  };

  console.log('AuthProvider rendering, loading:', loading);

  // Always render children, but provide loading state
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 