import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Check if we're inside a community
  const communityMatch = location.pathname.match(/\/communities\/(\d+)/);
  const communityId = communityMatch ? communityMatch[1] : null;

  return (
    <nav className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand">
          <svg width="28" height="28" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="#2E7D32"/>
            <text x="50" y="68" fontFamily="Arial,sans-serif" fontSize="50" fontWeight="bold" fill="white" textAnchor="middle">H</text>
          </svg>
          <span>HOABoard</span>
        </Link>

        {communityId && (
          <div className="navbar-community-nav">
            <Link to={`/communities/${communityId}`} className={location.pathname === `/communities/${communityId}` ? 'active' : ''}>Home</Link>
            <Link to={`/communities/${communityId}/potlucks`} className={location.pathname.includes('/potlucks') ? 'active' : ''}>Potlucks</Link>
            <Link to={`/communities/${communityId}/suggestions`} className={location.pathname.includes('/suggestions') ? 'active' : ''}>Suggestions</Link>
            <Link to={`/communities/${communityId}/questions`} className={location.pathname.includes('/questions') ? 'active' : ''}>Questions</Link>
            <Link to={`/communities/${communityId}/calendar`} className={location.pathname.includes('/calendar') ? 'active' : ''}>Calendar</Link>
            <Link to={`/communities/${communityId}/polls`} className={location.pathname.includes('/polls') ? 'active' : ''}>Polls</Link>
          </div>
        )}

        <div className="navbar-user">
          <Link to="/profile" className="navbar-profile">
            <Avatar name={user.name} url={user.avatar_url} size={32} />
            <span className="navbar-username">{user.name}</span>
          </Link>
          <button onClick={handleLogout} className="btn btn-outline btn-sm">Logout</button>
        </div>
      </div>
    </nav>
  );
}
