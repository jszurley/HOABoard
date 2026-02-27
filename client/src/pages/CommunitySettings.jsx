import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunity, updateCommunity, deleteCommunity, regenerateInviteCode, getPendingMembers, acceptMember, rejectMember, leaveCommunity } from '../services/api';
import './CommunitySettings.css';

export default function CommunitySettings() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isCommunityAdmin, loadCommunities } = useAuth();
  const [community, setCommunity] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', address: '' });
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [communityId]);

  const loadData = async () => {
    try {
      const [communityRes, pendingRes] = await Promise.all([
        getCommunity(communityId),
        isCommunityAdmin(communityId) ? getPendingMembers(communityId) : Promise.resolve({ data: [] })
      ]);
      setCommunity(communityRes.data.community);
      setForm({
        name: communityRes.data.community.name || '',
        description: communityRes.data.community.description || '',
        address: communityRes.data.community.address || ''
      });
      setPending(pendingRes.data);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await updateCommunity(communityId, form);
      await loadCommunities();
      setMessage('Community updated');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenCode = async () => {
    try {
      const { data } = await regenerateInviteCode(communityId);
      setCommunity({ ...community, invite_code: data.inviteCode });
      setMessage('Invite code regenerated');
    } catch {
      setError('Failed to regenerate code');
    }
  };

  const handleAccept = async (userId) => {
    try {
      await acceptMember(communityId, userId);
      setPending(pending.filter(p => p.user_id !== userId));
      setMessage('Member accepted');
    } catch {
      setError('Failed to accept member');
    }
  };

  const handleReject = async (userId) => {
    try {
      await rejectMember(communityId, userId);
      setPending(pending.filter(p => p.user_id !== userId));
    } catch {
      setError('Failed to reject');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this community? This cannot be undone.')) return;
    try {
      await deleteCommunity(communityId);
      await loadCommunities();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete community');
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this community?')) return;
    try {
      await leaveCommunity(communityId);
      await loadCommunities();
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to leave community');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="container settings-page">
      <div className="page-header">
        <h1>Community Settings</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {isCommunityAdmin(communityId) && (
        <>
          <div className="card">
            <h2>Community Details</h2>
            <form onSubmit={handleUpdate}>
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          <div className="card">
            <h2>Invite Code</h2>
            <p className="text-muted mb-1">Share this code with residents to join your community.</p>
            <div className="invite-code-display">
              <code className="invite-code">{community?.invite_code}</code>
              <button onClick={() => navigator.clipboard.writeText(community?.invite_code)} className="btn btn-outline btn-sm">Copy</button>
              <button onClick={handleRegenCode} className="btn btn-outline btn-sm">Regenerate</button>
            </div>
          </div>

          {pending.length > 0 && (
            <div className="card">
              <h2>Pending Members ({pending.length})</h2>
              <div className="pending-list">
                {pending.map(member => (
                  <div key={member.user_id} className="pending-item">
                    <div>
                      <strong>{member.name}</strong>
                      <span className="text-muted"> - {member.email}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleAccept(member.user_id)} className="btn btn-success btn-sm">Accept</button>
                      <button onClick={() => handleReject(member.user_id)} className="btn btn-danger btn-sm">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="card danger-zone">
        <h2>Danger Zone</h2>
        <div className="danger-actions">
          <button onClick={handleLeave} className="btn btn-outline">Leave Community</button>
          {isCommunityAdmin(communityId) && (
            <button onClick={handleDelete} className="btn btn-danger">Delete Community</button>
          )}
        </div>
      </div>
    </div>
  );
}
