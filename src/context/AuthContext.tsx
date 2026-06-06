import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import { AuthUser, authService } from '@/services/auth.service';

interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (user: Partial<AuthUser>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('AuthContext: Failed to load current user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const user = await authService.login(email, password);
      setCurrentUser(user);
      return true;
    } catch (error) {
      console.error('AuthContext: Login failed with error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const user = await authService.register({ name, email, password });
      if (!user) {
        return false;
      }
      const loggedInUser = await authService.login(email, password);
      setCurrentUser(loggedInUser);
      return true;
    } catch (error) {
      console.error('AuthContext: Registration failed with error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const updateUserProfile = async (userData: Partial<AuthUser>): Promise<boolean> => {
    if (!currentUser) return false;

    setCurrentUser((prev) => (prev ? { ...prev, ...userData } : prev));
    return true;
  };

  const value = useMemo(
    () => ({
      currentUser,
      isLoading,
      login,
      register,
      logout,
      updateUserProfile,
    }),
    [currentUser, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};