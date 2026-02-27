import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getSuggestions,
  createSuggestion,
  updateSuggestion,
  deleteSuggestion,
  updateSuggestionStatus,
  toggleUpvote,
} from '../services/api';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', badge: 'badge-warning' },
  { value: 'approved', label: 'Approved', badge: 'badge-success' },
  { value: 'discussed', label: 'Discussed', badge: 'badge-info' },
  { value: 'rejected', label: 'Rejected', badge: 'badge-danger' },
];

function getStatusBadge(status) {
  const match = STATUS_OPTIONS.find((s) => s.value === status);
  return match ? match.badge : 'badge-warning';
}

function getStatusLabel(status) {
  const match = STATUS_OPTIONS.find((s) => s.value === status);
  return match ? match.label : 'Pending';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Suggestions() {
  const { communityId } = useParams();
  const { user, isCommunityAdmin, isBoardMember } = useAuth();

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [communityId]);

  const loadSuggestions = async () => {
    try {
      const { data } = await getSuggestions(communityId);
      const sorted = (data || []).sort(
        (a, b) => (b.upvote_count || 0) - (a.upvote_count || 0)
      );
      setSuggestions(sorted);
    } catch {
      setError('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await createSuggestion(communityId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
      });
      setSuggestions((prev) =>
        [data, ...prev].sort(
          (a, b) => (b.upvote_count || 0) - (a.upvote_count || 0)
        )
      );
      setFormData({ title: '', description: '' });
      setShowCreateModal(false);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !editingSuggestion) return;
    setSubmitting(true);
    try {
      const { data } = await updateSuggestion(communityId, editingSuggestion.id, {
        title: formData.title.trim(),
        description: formData.description.trim(),
      });
      setSuggestions((prev) =>
        prev
          .map((s) => (s.id === editingSuggestion.id ? { ...s, ...data } : s))
          .sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0))
      );
      setShowEditModal(false);
      setEditingSuggestion(null);
      setFormData({ title: '', description: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update suggestion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (suggestion) => {
    if (!confirm(`Delete suggestion "${suggestion.title}"?`)) return;
    try {
      await deleteSuggestion(communityId, suggestion.id);
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id));
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete suggestion');
    }
  };

  const handleStatusChange = async (suggestionId, newStatus) => {
    try {
      await updateSuggestionStatus(communityId, suggestionId, newStatus);
      setSuggestions((prev) =>
        prev.map((s) => (s.id === suggestionId ? { ...s, status: newStatus } : s))
      );
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleToggleUpvote = async (suggestionId) => {
    try {
      const { data } = await toggleUpvote(communityId, suggestionId);
      setSuggestions((prev) =>
        prev
          .map((s) =>
            s.id === suggestionId
              ? {
                  ...s,
                  upvote_count: data.upvote_count,
                  user_upvoted: data.user_upvoted,
                }
              : s
          )
          .sort((a, b) => (b.upvote_count || 0) - (a.upvote_count || 0))
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to toggle upvote');
    }
  };

  const openEditModal = (suggestion) => {
    setEditingSuggestion(suggestion);
    setFormData({ title: suggestion.title, description: suggestion.description || '' });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingSuggestion(null);
    setFormData({ title: '', description: '' });
  };

  const canEditSuggestion = (suggestion) => {
    return user && suggestion.submitted_by === user.id;
  };

  const canDeleteSuggestion = (suggestion) => {
    return (
      user &&
      (suggestion.submitted_by === user.id || isCommunityAdmin(communityId))
    );
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header flex flex-between flex-center">
        <div>
          <h1>Meeting Suggestions</h1>
          <p className="text-muted">
            Submit and vote on agenda topics for board meetings
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setFormData({ title: '', description: '' });
            setShowCreateModal(true);
          }}
        >
          New Suggestion
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {suggestions.length === 0 ? (
        <div className="empty-state">
          <h3>No suggestions yet</h3>
          <p>Be the first to submit an agenda topic for the next board meeting.</p>
          <button
            className="btn btn-primary"
            onClick={() => {
              setFormData({ title: '', description: '' });
              setShowCreateModal(true);
            }}
          >
            Submit a Suggestion
          </button>
        </div>
      ) : (
        <div className="suggestions-list">
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="card suggestion-card">
              <div className="flex flex-between flex-center">
                <div className="flex flex-center gap-1">
                  <button
                    className={`upvote-btn${suggestion.user_upvoted ? ' upvoted' : ''}`}
                    onClick={() => handleToggleUpvote(suggestion.id)}
                    title={suggestion.user_upvoted ? 'Remove upvote' : 'Upvote'}
                  >
                    <span>&#9650;</span>
                    <span>{suggestion.upvote_count || 0}</span>
                  </button>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {suggestion.title}
                    </h3>
                    <div className="suggestion-meta">
                      <span>By {suggestion.submitted_by_name}</span>
                      <span>&middot;</span>
                      <span>{formatDate(suggestion.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-center gap-1">
                  {isBoardMember(communityId) ? (
                    <select
                      className="btn btn-sm btn-outline"
                      value={suggestion.status || 'pending'}
                      onChange={(e) =>
                        handleStatusChange(suggestion.id, e.target.value)
                      }
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={`badge ${getStatusBadge(suggestion.status)}`}
                    >
                      {getStatusLabel(suggestion.status)}
                    </span>
                  )}
                </div>
              </div>

              {suggestion.description && (
                <p className="mt-1 text-muted">{suggestion.description}</p>
              )}

              {(canEditSuggestion(suggestion) || canDeleteSuggestion(suggestion)) && (
                <div className="flex gap-1 mt-1">
                  {canEditSuggestion(suggestion) && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openEditModal(suggestion)}
                    >
                      Edit
                    </button>
                  )}
                  {canDeleteSuggestion(suggestion) && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(suggestion)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Suggestion</h2>
              <button className="modal-close" onClick={closeModals}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="create-title">Title</label>
                <input
                  id="create-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="What topic should be discussed?"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="create-description">Description</label>
                <textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Provide additional details or context..."
                  rows={4}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !formData.title.trim()}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSuggestion && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Suggestion</h2>
              <button className="modal-close" onClick={closeModals}>
                &times;
              </button>
            </div>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label htmlFor="edit-title">Title</label>
                <input
                  id="edit-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="What topic should be discussed?"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-description">Description</label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Provide additional details or context..."
                  rows={4}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModals}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !formData.title.trim()}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .suggestions-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .suggestion-card {
          transition: box-shadow 0.2s;
        }

        .suggestion-card:hover {
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
        }

        .upvote-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          background: none;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.4rem 0.6rem;
          min-width: 44px;
          min-height: 44px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s;
          line-height: 1;
        }

        .upvote-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background-color: var(--primary-light);
        }

        .upvote-btn.upvoted {
          border-color: var(--primary);
          color: var(--primary);
          background-color: var(--primary-light);
        }

        .suggestion-meta {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }
      `}</style>
    </div>
  );
}
