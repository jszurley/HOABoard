import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CommunitySetup from './pages/CommunitySetup';
import CommunityDashboard from './pages/CommunityDashboard';
import CommunitySettings from './pages/CommunitySettings';
import Members from './pages/Members';
import Potlucks from './pages/Potlucks';
import Suggestions from './pages/Suggestions';
import Questions from './pages/Questions';
import Calendar from './pages/Calendar';
import Polls from './pages/Polls';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/communities/new" element={<ProtectedRoute><CommunitySetup /></ProtectedRoute>} />
        <Route path="/communities/join" element={<ProtectedRoute><CommunitySetup /></ProtectedRoute>} />
        <Route path="/communities/:communityId" element={<ProtectedRoute><CommunityDashboard /></ProtectedRoute>} />
        <Route path="/communities/:communityId/settings" element={<ProtectedRoute><CommunitySettings /></ProtectedRoute>} />
        <Route path="/communities/:communityId/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
        <Route path="/communities/:communityId/potlucks" element={<ProtectedRoute><Potlucks /></ProtectedRoute>} />
        <Route path="/communities/:communityId/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
        <Route path="/communities/:communityId/questions" element={<ProtectedRoute><Questions /></ProtectedRoute>} />
        <Route path="/communities/:communityId/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/communities/:communityId/polls" element={<ProtectedRoute><Polls /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
