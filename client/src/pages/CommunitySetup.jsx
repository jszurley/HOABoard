import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createCommunity, joinCommunity } from '../services/api';
import './Auth.css';

export default function CommunitySetup() {
  const location = useLocation();
  const isJoin = location.pathname.includes('/join');
  const navigate = useNavigate();
  const { loadCommunities } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await createCommunity({ name, description, address });
      await loadCommunities();
      navigate(`/communities/${data.community.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { data } = await joinCommunity(inviteCode.trim());
      setMessage(data.message);
      await loadCommunities();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{isJoin ? 'Join a Community' : 'Create Community'}</h1>
          <p>{isJoin ? 'Enter the invite code from your HOA board' : 'Set up a new HOA community'}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        {isJoin ? (
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label>Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter invite code"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Joining...' : 'Join Community'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Community Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sunset Heights HOA"
                required
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of your community"
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Community address"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Back to Dashboard</a>
        </div>
      </div>
    </div>
  );
}
