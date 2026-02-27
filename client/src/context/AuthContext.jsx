import { createContext, useContext, useState, useEffect } from 'react';
import { getMe, getCommunities } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await getMe();
      setUser(data.user);
      await loadCommunities();
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCommunities = async () => {
    try {
      const { data } = await getCommunities();
      setCommunities(data);
    } catch {
      setCommunities([]);
    }
  };

  const loginUser = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
    loadCommunities();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCommunities([]);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const getCommunityRole = (communityId) => {
    const membership = communities.find(c => c.id === parseInt(communityId));
    return membership?.role || null;
  };

  const isCommunityAdmin = (communityId) => {
    return getCommunityRole(communityId) === 'admin';
  };

  const isBoardMember = (communityId) => {
    const role = getCommunityRole(communityId);
    return role === 'admin' || role === 'board_member';
  };

  return (
    <AuthContext.Provider value={{
      user, communities, loading,
      loginUser, logout, refreshUser, loadCommunities,
      getCommunityRole, isCommunityAdmin, isBoardMember
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
