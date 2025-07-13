import React, { createContext, useState, useEffect, useContext } from 'react';
import { login, loginWithPassword } from '../services/api';
import toast from 'react-hot-toast';
import { PasswordLoginResponse } from '../services/types';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (authCode: string) => Promise<void>;
  loginWithPassword: (userAuth: string, password: string) => Promise<PasswordLoginResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  loginWithPassword: async () => ({ error: { message: 'Not implemented' } }),
  logout: () => {},
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token from localStorage on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('byToken');
      if (storedToken) {
        setToken(storedToken);
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const handleLogin = async (authCode: string) => {
    setIsLoading(true);
    try {
      const response = await login(authCode);
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      if (response.by_jwt) {
        localStorage.setItem('byToken', response.by_jwt);
        setToken(response.by_jwt);
        toast.success('Successfully authenticated!');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Authentication failed');
      localStorage.removeItem('byToken');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (userAuth: string, password: string): Promise<PasswordLoginResponse> => {
    setIsLoading(true);
    try {
      const response = await loginWithPassword(userAuth, password);
      
      if (response.error) {
        toast.error(response.error.message);
        return response;
      }
      
      if (response.verification_required) {
        toast.error('Verification required. Please check your email or phone.');
        return response;
      }
      
      if (response.network?.by_jwt) {
        localStorage.setItem('byToken', response.network.by_jwt);
        setToken(response.network.by_jwt);
        toast.success(`Successfully authenticated as ${response.network.name}!`);
        return response;
      }
      
      throw new Error('Authentication failed');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password authentication failed';
      toast.error(errorMessage);
      return {
        error: {
          message: errorMessage,
        },
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('byToken');
    setToken(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        isAuthenticated: !!token,
        isLoading,
        login: handleLogin,
        loginWithPassword: handlePasswordLogin,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};