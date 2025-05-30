// /todoList/frontend/context/AuthContext.js

import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

// Wrap your app in <AuthProvider> so any screen can access token/setToken
export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
