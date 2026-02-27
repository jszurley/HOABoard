import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPolls, createPoll, getPoll, deletePoll, castVote } from '../services/api';

export default function Polls() {
  const { communityId } = useParams();
  const { user, isBoardMember } = useAuth();

  const [view, setView] = useState('list');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Detail view state
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [userVotes, setUserVotes] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  // Create poll modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    question: '',
    description: '',
    poll_type: 'single',
    is_anonymous: false,
    results_visible: 'always',
    closes_at: '',
    options: ['', ''],
  });
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadPolls();
  }, [communityId]);

  const loadPolls = async () => {
    try {
      setError('');
      const { data } = await getPolls(communityId);
      setPolls(data);
    } catch {
      setError('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const isPollActive = (poll) => {
    return !poll.closes_at || new Date(poll.closes_at) > new Date();
  };

  const getTimeRemaining = (closesAt) => {
    if (!closesAt) return 'No end date';
    const now = new Date();
    const end = new Date(closesAt);
    const diff = end - now;
    if (diff <= 0) return 'Closed';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handleViewPoll = async (pollId) => {
    setDetailLoading(true);
    setError('');
    try {
      const { data } = await getPoll(communityId, pollId);
      setSelectedPoll(data.poll);
      setUserVotes(data.user_votes || []);
      setTotalVotes(data.total_votes || 0);
      setSelectedOptions([]);
      setView('detail');
    } catch {
      setError('Failed to load poll details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0 || !selectedPoll) return;
    setVoteSubmitting(true);
    setError('');
    try {
      await castVote(communityId, selectedPoll.id, selectedOptions);
      // Reload poll details to get updated results
      const { data } = await getPoll(communityId, selectedPoll.id);
      setSelectedPoll(data.poll);
      setUserVotes(data.user_votes || []);
      setTotalVotes(data.total_votes || 0);
      setSelectedOptions([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cast vote');
    } finally {
      setVoteSubmitting(false);
    }
  };

  const handleOptionSelect = (optionId) => {
    if (selectedPoll.poll_type === 'single') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const canSeeResults = (poll) => {
    if (!poll) return false;
    const active = isPollActive(poll);
    switch (poll.results_visible) {
      case 'always':
        return true;
      case 'after_vote':
        return userVotes.length > 0;
      case 'after_close':
        return !active;
      default:
        return false;
    }
  };

  const handleDeletePoll = async (pollId) => {
    if (!confirm('Are you sure you want to delete this poll?')) return;
    try {
      await deletePoll(communityId, pollId);
      if (view === 'detail') {
        setView('list');
        setSelectedPoll(null);
      }
      await loadPolls();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete poll');
    }
  };

  // Create poll handlers
  const handleCreateFormChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index, value) => {
    setCreateForm((prev) => {
      const options = [...prev.options];
      options[index] = value;
      return { ...prev, options };
    });
  };

  const addOption = () => {
    setCreateForm((prev) => ({ ...prev, options: [...prev.options, ''] }));
  };

  const removeOption = (index) => {
    if (createForm.options.length <= 2) return;
    setCreateForm((prev) => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const resetCreateForm = () => {
    setCreateForm({
      question: '',
      description: '',
      poll_type: 'single',
      is_anonymous: false,
      results_visible: 'always',
      closes_at: '',
      options: ['', ''],
    });
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    const filledOptions = createForm.options.filter((o) => o.trim() !== '');
    if (filledOptions.length < 2) {
      setError('At least 2 options are required');
      return;
    }
    setCreateLoading(true);
    setError('');
    try {
      await createPoll(communityId, {
        question: createForm.question,
        description: createForm.description,
        poll_type: createForm.poll_type,
        is_anonymous: createForm.is_anonymous,
        results_visible: createForm.results_visible,
        closes_at: createForm.closes_at || null,
        options: filledOptions,
      });
      setShowCreateModal(false);
      resetCreateForm();
      await loadPolls();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create poll');
    } finally {
      setCreateLoading(false);
    }
  };

  const activePolls = polls.filter(isPollActive);
  const closedPolls = polls.filter((p) => !isPollActive(p));

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // Detail view
  if (view === 'detail') {
    if (detailLoading) {
      return (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      );
    }

    if (!selectedPoll) {
      return (
        <div className="container">
          <div className="alert alert-error">Poll not found</div>
          <button className="btn btn-outline mt-1" onClick={() => setView('list')}>
            Back to Polls
          </button>
        </div>
      );
    }

    const active = isPollActive(selectedPoll);
    const hasVoted = userVotes.length > 0;
    const showResults = canSeeResults(selectedPoll);
    const maxVoteCount = selectedPoll.options
      ? Math.max(...selectedPoll.options.map((o) => o.vote_count || 0), 1)
      : 1;

    return (
      <div className="container">
        <style>{componentStyles}</style>
        <button className="btn btn-outline mb-1" onClick={() => { setView('list'); setSelectedPoll(null); }}>
          &larr; Back to Polls
        </button>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <div className="flex flex-between">
            <div>
              <h2>{selectedPoll.question}</h2>
              {selectedPoll.description && (
                <p className="text-muted mt-1">{selectedPoll.description}</p>
              )}
            </div>
            <div>
              <span className={`badge ${active ? 'badge-success' : 'badge-danger'}`}>
                {active ? getTimeRemaining(selectedPoll.closes_at) : 'Closed'}
              </span>
            </div>
          </div>

          <div className="poll-meta mt-1">
            <span className={`badge ${selectedPoll.poll_type === 'single' ? 'badge-primary' : 'badge-warning'}`}>
              {selectedPoll.poll_type === 'single' ? 'Single Choice' : 'Multiple Choice'}
            </span>
            {selectedPoll.is_anonymous && (
              <span className="badge badge-warning">Anonymous</span>
            )}
            <span className="text-muted">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</span>
          </div>

          {/* Voting UI - show if poll is active and user hasn't voted */}
          {active && !hasVoted && (
            <div className="poll-options mt-1">
              {selectedPoll.options && selectedPoll.options.map((option) => (
                <label key={option.id} className="poll-option">
                  <input
                    type={selectedPoll.poll_type === 'single' ? 'radio' : 'checkbox'}
                    name="poll-vote"
                    checked={selectedOptions.includes(option.id)}
                    onChange={() => handleOptionSelect(option.id)}
                  />
                  <span>{option.option_text}</span>
                </label>
              ))}
              <button
                className="btn btn-primary mt-1"
                onClick={handleVote}
                disabled={selectedOptions.length === 0 || voteSubmitting}
              >
                {voteSubmitting ? 'Submitting...' : 'Vote'}
              </button>
            </div>
          )}

          {/* Already voted message */}
          {hasVoted && active && (
            <p className="text-muted mt-1">You have already voted on this poll.</p>
          )}

          {/* Results display */}
          {showResults && selectedPoll.options && (
            <div className="mt-1">
              <h3>Results</h3>
              {selectedPoll.options.map((option) => {
                const percentage = totalVotes > 0
                  ? Math.round((option.vote_count / totalVotes) * 100)
                  : 0;
                return (
                  <div key={option.id} className="result-bar mb-1">
                    <div className="flex flex-between">
                      <span className="result-text">
                        {option.option_text}
                        {userVotes.includes(option.id) && ' (your vote)'}
                      </span>
                      <span className="text-muted">{option.vote_count} ({percentage}%)</span>
                    </div>
                    <div className="result-bar-track">
                      <div
                        className="result-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Results not available message */}
          {!showResults && (
            <div className="mt-1 text-muted">
              {selectedPoll.results_visible === 'after_vote' && !hasVoted && active && (
                <p>Results will be visible after you vote.</p>
              )}
              {selectedPoll.results_visible === 'after_close' && active && (
                <p>Results will be visible after the poll closes.</p>
              )}
            </div>
          )}

          {/* Board member delete */}
          {isBoardMember(communityId) && (
            <div className="mt-1" style={{ borderTop: '1px solid #eee', paddingTop: '1rem' }}>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDeletePoll(selectedPoll.id)}
              >
                Delete Poll
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="container">
      <style>{componentStyles}</style>
      <div className="page-header">
        <h1>Polls</h1>
        {isBoardMember(communityId) && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            Create Poll
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Active Polls */}
      <h2 className="mb-1">Active Polls</h2>
      {activePolls.length === 0 ? (
        <div className="empty-state">
          <p>No active polls right now.</p>
        </div>
      ) : (
        activePolls.map((poll) => (
          <div key={poll.id} className="card poll-card mb-1" onClick={() => handleViewPoll(poll.id)}>
            <div className="flex flex-between">
              <h3>{poll.question}</h3>
              <span className="badge badge-success">{getTimeRemaining(poll.closes_at)}</span>
            </div>
            <div className="poll-meta mt-1">
              <span className={`badge ${poll.poll_type === 'single' ? 'badge-primary' : 'badge-warning'}`}>
                {poll.poll_type === 'single' ? 'Single Choice' : 'Multiple Choice'}
              </span>
              {poll.is_anonymous && <span className="badge badge-warning">Anonymous</span>}
              <span className="text-muted">{poll.vote_count || 0} vote{(poll.vote_count || 0) !== 1 ? 's' : ''}</span>
            </div>
            {isBoardMember(communityId) && (
              <div className="mt-1" style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleDeletePoll(poll.id); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Closed Polls */}
      <h2 className="mb-1 mt-1">Closed Polls</h2>
      {closedPolls.length === 0 ? (
        <div className="empty-state">
          <p>No closed polls.</p>
        </div>
      ) : (
        closedPolls.map((poll) => (
          <div key={poll.id} className="card poll-card mb-1" onClick={() => handleViewPoll(poll.id)}>
            <div className="flex flex-between">
              <h3>{poll.question}</h3>
              <span className="badge badge-danger">Closed</span>
            </div>
            <div className="poll-meta mt-1">
              <span className={`badge ${poll.poll_type === 'single' ? 'badge-primary' : 'badge-warning'}`}>
                {poll.poll_type === 'single' ? 'Single Choice' : 'Multiple Choice'}
              </span>
              {poll.is_anonymous && <span className="badge badge-warning">Anonymous</span>}
              <span className="text-muted">{poll.vote_count || 0} vote{(poll.vote_count || 0) !== 1 ? 's' : ''}</span>
            </div>
            {isBoardMember(communityId) && (
              <div className="mt-1" style={{ textAlign: 'right' }}>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); handleDeletePoll(poll.id); }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Poll</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleCreatePoll}>
              <div className="form-group">
                <label>Question *</label>
                <input
                  type="text"
                  value={createForm.question}
                  onChange={(e) => handleCreateFormChange('question', e.target.value)}
                  placeholder="What would you like to ask?"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => handleCreateFormChange('description', e.target.value)}
                  placeholder="Optional additional context..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Poll Type</label>
                <select
                  value={createForm.poll_type}
                  onChange={(e) => handleCreateFormChange('poll_type', e.target.value)}
                >
                  <option value="single">Single Choice</option>
                  <option value="multiple">Multiple Choice</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.is_anonymous}
                    onChange={(e) => handleCreateFormChange('is_anonymous', e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  Anonymous Voting
                </label>
              </div>

              <div className="form-group">
                <label>Results Visibility</label>
                <select
                  value={createForm.results_visible}
                  onChange={(e) => handleCreateFormChange('results_visible', e.target.value)}
                >
                  <option value="always">Always visible</option>
                  <option value="after_vote">Visible after voting</option>
                  <option value="after_close">Visible after poll closes</option>
                </select>
              </div>

              <div className="form-group">
                <label>Closes At</label>
                <input
                  type="datetime-local"
                  value={createForm.closes_at}
                  onChange={(e) => handleCreateFormChange('closes_at', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Options (minimum 2)</label>
                {createForm.options.map((option, index) => (
                  <div key={index} className="option-input-row">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      required
                    />
                    {createForm.options.length > 2 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeOption(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-outline btn-sm mt-1" onClick={addOption}>
                  + Add Option
                </button>
              </div>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => { setShowCreateModal(false); resetCreateForm(); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create Poll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const componentStyles = `
  .poll-card {
    cursor: pointer;
    transition: box-shadow 0.2s, transform 0.2s;
  }
  .poll-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .poll-options {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .poll-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }
  .poll-option:hover {
    background-color: #f5f5f5;
    border-color: #bbb;
  }

  .poll-option input {
    margin: 0;
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .result-bar {
    margin-bottom: 0.5rem;
  }
  .result-bar-track {
    width: 100%;
    height: 24px;
    background-color: #f0f0f0;
    border-radius: 12px;
    overflow: hidden;
    margin-top: 0.25rem;
  }
  .result-fill {
    height: 100%;
    background: linear-gradient(90deg, #4f46e5, #7c3aed);
    border-radius: 12px;
    transition: width 0.4s ease;
    min-width: 0;
  }

  .result-text {
    font-weight: 500;
  }

  .option-input-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .option-input-row input {
    flex: 1;
  }

  .poll-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
`;
