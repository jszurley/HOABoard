import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCommunity, updateMemberRole, removeMember } from '../services/api';
import Avatar from '../components/Avatar';
import './Members.css';

export default function Members() {
  const { communityId } = useParams();
  const { user, isCommunityAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMembers();
  }, [communityId]);

  const loadMembers = async () => {
    try {
      const { data } = await getCommunity(communityId);
      setMembers(data.members || []);
    } catch {
      setError('Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await updateMemberRole(communityId, userId, role);
      setMembers(members.map(m => m.id === userId ? { ...m, role } : m));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleRemove = async (userId, name) => {
    if (!confirm(`Remove ${name} from the community?`)) return;
    try {
      await removeMember(communityId, userId);
      setMembers(members.filter(m => m.id !== userId));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const roleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'board_member': return 'Board Member';
      default: return 'Resident';
    }
  };

  const roleBadge = (role) => {
    switch (role) {
      case 'admin': return 'badge-primary';
      case 'board_member': return 'badge-info';
      default: return 'badge-success';
    }
  };

  return (
    <div className="container members-page">
      <div className="page-header">
        <h1>Members</h1>
        <p>{members.length} member{members.length !== 1 ? 's' : ''}</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="members-list">
          {members.map(member => (
            <div key={member.id} className="member-item">
              <div className="member-info">
                <Avatar name={member.name} size={40} />
                <div>
                  <div className="member-name">
                    {member.name}
                    {member.id === user.id && <span className="text-muted"> (you)</span>}
                  </div>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{member.email}</div>
                </div>
              </div>
              <div className="member-actions">
                <span className={`badge ${roleBadge(member.role)}`}>{roleLabel(member.role)}</span>
                {isCommunityAdmin(communityId) && member.id !== user.id && (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="resident">Resident</option>
                      <option value="board_member">Board Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => handleRemove(member.id, member.name)} className="btn btn-danger btn-sm">Remove</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
