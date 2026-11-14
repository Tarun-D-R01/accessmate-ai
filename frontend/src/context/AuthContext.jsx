import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { supabase, isFrontendSupabaseConfigured } from '../services/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('accessmate_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('accessmate_token') || null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('accessmate_token')));

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem('accessmate_user', JSON.stringify(data.user));
        }
      } catch {
        localStorage.removeItem('accessmate_token');
        localStorage.removeItem('accessmate_user');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, [token]);

  const saveAuth = useCallback((authToken, userData) => {
    localStorage.setItem('accessmate_token', authToken);
    localStorage.setItem('accessmate_user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  }, []);

  const login = async (email, password) => {
    if (isFrontendSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signInWithPassword({ email, password });
      } catch {
        // Backend /auth/login handles verification and session creation
      }
    }
    const { data } = await api.post('/auth/login', { email, password });
    saveAuth(data.token, data.user);
    return data;
  };

  const register = async (name, email, password, preferredLanguage = 'English') => {
    if (isFrontendSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signUp({
          email,
          password,
          options: { data: { name, preferredLanguage } },
        });
      } catch {
        // Backend /auth/register handles registration and session creation
      }
    }
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      preferredLanguage,
    });
    saveAuth(data.token, data.user);
    return data;
  };

  const demoLogin = async () => {
    const { data } = await api.post('/auth/demo');
    saveAuth(data.token, data.user);
    return data;
  };

  const logout = useCallback(() => {
    if (isFrontendSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem('accessmate_token');
    localStorage.removeItem('accessmate_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
