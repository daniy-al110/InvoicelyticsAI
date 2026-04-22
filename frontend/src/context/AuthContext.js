import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      fetchUserProfile();
    } else {
      localStorage.removeItem('token');
      setUser(null);
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      console.log(`DEBUG: Fetching profile from ${process.env.REACT_APP_BACKEND_URL}/api/auth/me`);
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        logout();
      }
    } catch (err) {
      console.error("Failed to fetch user profile", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, message: data.detail || 'Login failed' };
  };

  const signup = async (email, password, fullName, phone) => {
    const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, phone })
    });
    const data = await response.json();
    if (response.ok) {
      setToken(data.access_token);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, message: data.detail || 'Signup failed' };
  };

  const googleLogin = async (credential) => {
    try {
      const url = `${process.env.REACT_APP_BACKEND_URL}/api/auth/google`;
      console.log(`DEBUG: Attempting Google Login at ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential })
      });
      
      const data = await response.json();
      if (response.ok) {
        setToken(data.access_token);
        setUser(data.user);
        return { success: true };
      }
      return { success: false, message: data.detail || 'Google Login failed' };
    } catch (err) {
      console.error("CRITICAL: Google Login Fetch Error:", err);
      return { 
        success: false, 
        message: `Network Error: ${err.message}. Please ensure the backend is running at ${process.env.REACT_APP_BACKEND_URL}` 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
