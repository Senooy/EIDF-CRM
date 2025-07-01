import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  role: string;
  subscription: {
    plan: string;
    status: string;
    maxUsers: number;
    maxProducts: number;
    maxOrders: number;
    aiGenerationsPerMonth: number;
  };
}

interface OrganizationContextType {
  organizations: Organization[];
  currentOrganization: Organization | null;
  loading: boolean;
  error: string | null;
  switchOrganization: (organizationId: string) => void;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, additionalData?: { website?: string; logo?: string }) => Promise<Organization>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user, getIdToken } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configure axios defaults for organization
  useEffect(() => {
    if (currentOrganization) {
      axios.defaults.headers.common['X-Organization-Id'] = currentOrganization.id;
    } else {
      delete axios.defaults.headers.common['X-Organization-Id'];
    }
  }, [currentOrganization]);

  // Configure axios auth interceptor
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      async (config) => {
        if (user) {
          const token = await getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [user, getIdToken]);

  const refreshOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get<Organization[]>('/api/my-organizations');
      setOrganizations(response.data);
      
      // If no current organization, select the first one
      if (!currentOrganization && response.data.length > 0) {
        const savedOrgId = localStorage.getItem('currentOrganizationId');
        const savedOrg = response.data.find(org => org.id === savedOrgId);
        setCurrentOrganization(savedOrg || response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrganizations();
  }, [user]);

  const switchOrganization = (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
      localStorage.setItem('currentOrganizationId', organizationId);
    }
  };

  const createOrganization = async (name: string, additionalData?: { website?: string; logo?: string }) => {
    const response = await axios.post<Organization>('/api/organizations', {
      name,
      ...additionalData,
    });
    
    const newOrg = response.data;
    setOrganizations([...organizations, newOrg]);
    setCurrentOrganization(newOrg);
    localStorage.setItem('currentOrganizationId', newOrg.id);
    
    return newOrg;
  };

  const value = {
    organizations,
    currentOrganization,
    loading,
    error,
    switchOrganization,
    refreshOrganizations,
    createOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}