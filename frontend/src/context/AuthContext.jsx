import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    const onUnauthorized = () => setUser(null);
    window.addEventListener('gradus:unauthorized', onUnauthorized);
    return () => window.removeEventListener('gradus:unauthorized', onUnauthorized);
  }, []);

  const login = async (username, password) => {
    const u = await api.post('/auth/login', { username, password });
    setUser(u);
  };

  const register = async (username, email, password) => {
    const u = await api.post('/auth/register', { username, email, password });
    setUser(u);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
