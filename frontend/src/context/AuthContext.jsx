import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getAuthStatus,
  getCurrentUser,
  loginUser,
  setupInitialAdmin,
} from '../api/authApi.js';
import { AUTH_TOKEN_KEY } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [hasUsers, setHasUsers] = useState(true);
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState('');

  const bootstrapAuth = useCallback(async () => {
    setLoading(true);
    setAuthError('');
    try {
      const status = await getAuthStatus();
      setAuthEnabled(status.authEnabled);
      setHasUsers(status.hasUsers);

      if (!status.authEnabled) {
        setUser({
          _id: null,
          name: 'Inventory Operator',
          email: '',
          role: 'admin',
          isGuestMode: true,
        });
        return;
      }

      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const me = await getCurrentUser();
        setUser(me.user);
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
      }
    } catch {
      setAuthError('Unable to reach backend server to verify session.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('veltrix:unauthorized', handleUnauthorized);
    return () =>
      window.removeEventListener('veltrix:unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials) => {
    const res = await loginUser(credentials);
    localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
    setUser(res.data.user);
    setHasUsers(true);
    return res;
  };

  const setupAdmin = async (payload) => {
    const res = await setupInitialAdmin(payload);
    localStorage.setItem(AUTH_TOKEN_KEY, res.data.token);
    setUser(res.data.user);
    setHasUsers(true);
    return res;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  const isAdmin = !authEnabled || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        loading,
        authEnabled,
        hasUsers,
        user,
        isAdmin,
        authError,
        login,
        setupAdmin,
        logout,
        refreshAuth: bootstrapAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
