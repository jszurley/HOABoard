import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
  const { user, communities } = useAuth();

  return (
    <div className="container dashboard-page">
      <div className="page-header">
        <h1>Welcome, {user?.name?.split(' ')[0]}!</h1>
        <p>Your HOA communities</p>
      </div>

      <div className="dashboard-actions">
        <Link to="/communities/new" className="btn btn-primary">Create Community</Link>
        <Link to="/communities/join" className="btn btn-outline">Join Community</Link>
      </div>

      {communities.length === 0 ? (
        <div className="empty-state card">
          <h3>No Communities Yet</h3>
          <p>Create a new HOA community or join an existing one with an invite code.</p>
          <div className="flex gap-1" style={{ justifyContent: 'center' }}>
            <Link to="/communities/new" className="btn btn-primary">Create Community</Link>
            <Link to="/communities/join" className="btn btn-outline">Join with Code</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          {communities.map(community => (
            <Link key={community.id} to={`/communities/${community.id}`} className="community-card card">
              <div className="community-card-header">
                <h3>{community.name}</h3>
                <span className={`badge badge-${community.role === 'admin' ? 'primary' : community.role === 'board_member' ? 'info' : 'success'}`}>
                  {community.role === 'board_member' ? 'Board Member' : community.role.charAt(0).toUpperCase() + community.role.slice(1)}
                </span>
              </div>
              {community.description && <p className="text-muted">{community.description}</p>}
              {community.address && <p className="community-address">{community.address}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
