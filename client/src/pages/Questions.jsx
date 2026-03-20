import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getQuestions,
  createQuestion,
  getQuestion,
  createQuestionResponse,
  updateQuestionVisibility,
  deleteQuestion,
  archiveQuestion,
  getArchivedQuestions,
} from '../services/api';

const style = document.createElement('style');
style.textContent = `
  .question-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin-bottom: 0.75rem;
    cursor: pointer;
    transition: box-shadow 0.2s, border-color 0.2s;
    background: var(--surface);
  }
  .question-card:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    border-color: var(--primary);
  }
  .question-card.active {
    border-color: var(--primary);
    box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  }
  .question-card .question-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .question-card .question-preview {
    color: var(--text-secondary);
    font-size: 0.875rem;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }
  .question-card .question-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  .question-detail {
    background: var(--surface);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    padding: 1.5rem;
    margin-bottom: 1rem;
  }
  .question-detail .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .question-detail .detail-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
  }
  .question-detail .detail-body {
    color: var(--text-primary);
    line-height: 1.7;
    white-space: pre-wrap;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border);
  }
  .question-detail .detail-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
  }
  .response-item {
    background: var(--background);
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    border-left: 3px solid var(--primary);
  }
  .response-item .response-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .response-item .response-author {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .response-item .response-date {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  .response-item .response-body {
    font-size: 0.925rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .response-form {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }
  .response-form h4 {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .visibility-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--surface);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s, border-color 0.2s;
    min-height: 36px;
  }
  .visibility-toggle:hover {
    background: var(--background);
    border-color: var(--primary);
  }
  .visibility-toggle:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .filter-tabs {
    display: flex;
    gap: 0.25rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid var(--border);
    padding-bottom: 0;
  }
  .filter-tabs button {
    padding: 0.5rem 1rem;
    border: none;
    background: none;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: color 0.2s, border-color 0.2s;
  }
  .filter-tabs button:hover {
    color: var(--text-primary);
  }
  .filter-tabs button.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
  }
`;
document.head.appendChild(style);

export default function Questions() {
  const { communityId } = useParams();
  const { user, isBoardMember, isCommunityAdmin } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Detail view
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New question form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newIsPublic, setNewIsPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Response form
  const [responseMessage, setResponseMessage] = useState('');
  const [respondingId, setRespondingId] = useState(null);

  // Visibility toggle
  const [togglingVisibility, setTogglingVisibility] = useState(null);

  // Archive/delete
  const [archivedQuestions, setArchivedQuestions] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [archiving, setArchiving] = useState(null);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, [communityId]);

  const loadQuestions = async () => {
    try {
      setError('');
      const { data } = await getQuestions(communityId);
      setQuestions(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuestion = async (questionId) => {
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion(null);
      return;
    }
    try {
      setDetailLoading(true);
      setError('');
      const { data } = await getQuestion(communityId, questionId);
      setSelectedQuestion(data);
      setResponseMessage('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load question details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;
    try {
      setSubmitting(true);
      setError('');
      await createQuestion(communityId, {
        title: newTitle.trim(),
        message: newMessage.trim(),
        is_public: newIsPublic,
      });
      setNewTitle('');
      setNewMessage('');
      setNewIsPublic(false);
      setShowNewForm(false);
      await loadQuestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitResponse = async (e, questionId) => {
    e.preventDefault();
    if (!responseMessage.trim()) return;
    try {
      setRespondingId(questionId);
      setError('');
      await createQuestionResponse(communityId, questionId, {
        message: responseMessage.trim(),
      });
      setResponseMessage('');
      // Reload the detail to show the new response
      const { data } = await getQuestion(communityId, questionId);
      setSelectedQuestion(data);
      // Also refresh the list to update status
      await loadQuestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit response');
    } finally {
      setRespondingId(null);
    }
  };

  const handleToggleVisibility = async (questionId, currentIsPublic) => {
    try {
      setTogglingVisibility(questionId);
      setError('');
      await updateQuestionVisibility(communityId, questionId, !currentIsPublic);
      // Reload detail and list
      if (selectedQuestion?.id === questionId) {
        const { data } = await getQuestion(communityId, questionId);
        setSelectedQuestion(data);
      }
      await loadQuestions();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update visibility');
    } finally {
      setTogglingVisibility(null);
    }
  };

  const loadArchivedQuestions = async () => {
    try {
      setError('');
      const { data } = await getArchivedQuestions(communityId);
      setArchivedQuestions(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load archived questions');
    }
  };

  const handleToggleArchived = async () => {
    if (!showArchived) {
      await loadArchivedQuestions();
    }
    setShowArchived(!showArchived);
    setSelectedQuestion(null);
  };

  const handleArchive = async (questionId, archive) => {
    const action = archive ? 'archive' : 'restore';
    if (!confirm(`Are you sure you want to ${action} this question?`)) return;
    try {
      setArchiving(questionId);
      setError('');
      await archiveQuestion(communityId, questionId, archive);
      setSelectedQuestion(null);
      await loadQuestions();
      if (showArchived) await loadArchivedQuestions();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${action} question`);
    } finally {
      setArchiving(null);
    }
  };

  const handleDelete = async (questionId) => {
    if (!confirm('Are you sure you want to permanently delete this question? This cannot be undone.')) return;
    try {
      setDeleting(questionId);
      setError('');
      await deleteQuestion(communityId, questionId);
      setSelectedQuestion(null);
      if (showArchived) {
        await loadArchivedQuestions();
      } else {
        await loadQuestions();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete question');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'answered':
        return <span className="badge badge-success">Answered</span>;
      case 'pending':
      default:
        return <span className="badge badge-warning">Pending</span>;
    }
  };

  const getVisibilityBadge = (isPublic) => {
    return isPublic ? (
      <span className="badge badge-info">Public</span>
    ) : (
      <span className="badge badge-warning">Private</span>
    );
  };

  const getFlagBadge = (question) => {
    if (!question.flagged || !boardMember) return null;
    return (
      <span
        className="badge badge-error"
        title={question.flag_reason || 'Flagged by moderation'}
        style={{ cursor: 'help' }}
      >
        Flagged
      </span>
    );
  };

  // Filter questions based on selected tab
  const filteredQuestions = questions.filter((q) => {
    if (filter === 'pending') return q.status === 'pending';
    if (filter === 'answered') return q.status === 'answered';
    return true;
  });

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const boardMember = isBoardMember(communityId);
  const isAdmin = isCommunityAdmin(communityId);

  const displayQuestions = showArchived ? archivedQuestions : filteredQuestions;

  return (
    <div className="container">
      <div className="page-header">
        <div className="flex flex-between flex-center">
          <div>
            <h1>Board Questions</h1>
            <p className="text-muted">
              {boardMember
                ? 'Review and respond to questions from community members'
                : 'Submit questions to the board and view responses'}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewForm(!showNewForm)}
          >
            {showNewForm ? 'Cancel' : 'New Question'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* New Question Form */}
      {showNewForm && (
        <div className="card mb-1">
          <h3 style={{ marginBottom: '1rem' }}>Submit a Question</h3>
          <form onSubmit={handleSubmitQuestion}>
            <div className="form-group">
              <label htmlFor="question-title">Title</label>
              <input
                id="question-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Brief summary of your question"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="question-message">Message</label>
              <textarea
                id="question-message"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Provide details about your question..."
                rows={4}
                required
              />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newIsPublic}
                  onChange={(e) => setNewIsPublic(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                Make this question public
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  (visible to all community members)
                </span>
              </label>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowNewForm(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !newTitle.trim() || !newMessage.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={!showArchived && filter === 'all' ? 'active' : ''}
          onClick={() => { setShowArchived(false); setFilter('all'); setSelectedQuestion(null); }}
        >
          All ({questions.length})
        </button>
        <button
          className={!showArchived && filter === 'pending' ? 'active' : ''}
          onClick={() => { setShowArchived(false); setFilter('pending'); setSelectedQuestion(null); }}
        >
          Pending ({questions.filter((q) => q.status === 'pending').length})
        </button>
        <button
          className={!showArchived && filter === 'answered' ? 'active' : ''}
          onClick={() => { setShowArchived(false); setFilter('answered'); setSelectedQuestion(null); }}
        >
          Answered ({questions.filter((q) => q.status === 'answered').length})
        </button>
        {isAdmin && (
          <button
            className={showArchived ? 'active' : ''}
            onClick={handleToggleArchived}
          >
            Archived {showArchived ? `(${archivedQuestions.length})` : ''}
          </button>
        )}
      </div>

      {/* Question List */}
      {displayQuestions.length === 0 ? (
        <div className="empty-state">
          <h3>{showArchived ? 'No archived questions' : 'No questions found'}</h3>
          <p>
            {showArchived
              ? 'No questions have been archived yet.'
              : filter !== 'all'
              ? `No ${filter} questions at the moment.`
              : boardMember
              ? 'No questions have been submitted yet.'
              : 'Submit a question to get started.'}
          </p>
        </div>
      ) : (
        displayQuestions.map((question) => (
          <div key={question.id}>
            <div
              className={`question-card ${
                selectedQuestion?.id === question.id ? 'active' : ''
              }`}
              onClick={() => handleSelectQuestion(question.id)}
            >
              <div className="question-title">{question.title}</div>
              <div className="question-preview">{question.message}</div>
              <div className="question-meta">
                {getStatusBadge(question.status)}
                {getVisibilityBadge(question.is_public)}
                {getFlagBadge(question)}
                {showArchived && <span className="badge badge-warning">Archived</span>}
                <span>by {question.submitted_by_name || 'Unknown'}</span>
                <span>{formatDate(question.created_at)}</span>
              </div>
            </div>

            {/* Detail View (expanded) */}
            {selectedQuestion?.id === question.id && (
              <div className="question-detail">
                {detailLoading ? (
                  <div className="loading">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <>
                    <div className="detail-header">
                      <h2>{selectedQuestion.title}</h2>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                        {boardMember && !showArchived && (
                          <button
                            className="visibility-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVisibility(
                                selectedQuestion.id,
                                selectedQuestion.is_public
                              );
                            }}
                            disabled={
                              togglingVisibility === selectedQuestion.id ||
                              (selectedQuestion.flagged && !selectedQuestion.is_public)
                            }
                            title={
                              selectedQuestion.flagged && !selectedQuestion.is_public
                                ? 'Cannot make public — flagged by moderation'
                                : ''
                            }
                          >
                            {togglingVisibility === selectedQuestion.id
                              ? 'Updating...'
                              : selectedQuestion.is_public
                              ? 'Make Private'
                              : 'Make Public'}
                          </button>
                        )}
                        {isAdmin && !showArchived && (
                          <button
                            className="visibility-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(selectedQuestion.id, true);
                            }}
                            disabled={archiving === selectedQuestion.id}
                          >
                            {archiving === selectedQuestion.id ? 'Archiving...' : 'Archive'}
                          </button>
                        )}
                        {isAdmin && showArchived && (
                          <button
                            className="visibility-toggle"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(selectedQuestion.id, false);
                            }}
                            disabled={archiving === selectedQuestion.id}
                          >
                            {archiving === selectedQuestion.id ? 'Restoring...' : 'Restore'}
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="visibility-toggle"
                            style={{ color: '#dc3545', borderColor: '#dc3545' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(selectedQuestion.id);
                            }}
                            disabled={deleting === selectedQuestion.id}
                          >
                            {deleting === selectedQuestion.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="detail-meta">
                      {getStatusBadge(selectedQuestion.status)}
                      {getVisibilityBadge(selectedQuestion.is_public)}
                      {getFlagBadge(selectedQuestion)}
                      {showArchived && <span className="badge badge-warning">Archived</span>}
                      <span>
                        Submitted by{' '}
                        {selectedQuestion.submitted_by_name || 'Unknown'}
                      </span>
                      <span>{formatDate(selectedQuestion.created_at)}</span>
                    </div>

                    {/* Flag reason (board members only) */}
                    {boardMember && selectedQuestion.flagged && (
                      <div
                        style={{
                          background: 'rgba(220, 53, 69, 0.08)',
                          border: '1px solid rgba(220, 53, 69, 0.25)',
                          borderRadius: '6px',
                          padding: '0.75rem 1rem',
                          marginBottom: '1rem',
                          fontSize: '0.85rem',
                          color: '#dc3545',
                        }}
                      >
                        <strong>Moderation Flag:</strong> {selectedQuestion.flag_reason}
                        <br />
                        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                          This question was automatically set to private. Review before making public.
                        </span>
                      </div>
                    )}

                    <div className="detail-body">{selectedQuestion.message}</div>

                    {/* Responses */}
                    <div className="mt-1">
                      <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>
                        Responses
                        {selectedQuestion.responses?.length > 0 &&
                          ` (${selectedQuestion.responses.length})`}
                      </h3>

                      {(!selectedQuestion.responses ||
                        selectedQuestion.responses.length === 0) && (
                        <p
                          className="text-muted"
                          style={{ fontSize: '0.9rem', marginBottom: '1rem' }}
                        >
                          No responses yet.
                        </p>
                      )}

                      {selectedQuestion.responses?.map((response) => (
                        <div key={response.id} className="response-item">
                          <div className="response-header">
                            <span className="response-author">
                              {response.responder_name || 'Board Member'}
                            </span>
                            <span className="response-date">
                              {formatDate(response.created_at)}
                            </span>
                          </div>
                          <div className="response-body">{response.message}</div>
                        </div>
                      ))}
                    </div>

                    {/* Response Form (board members only) */}
                    {boardMember && !showArchived && (
                      <div className="response-form">
                        <h4>Write a Response</h4>
                        <form
                          onSubmit={(e) =>
                            handleSubmitResponse(e, selectedQuestion.id)
                          }
                        >
                          <div className="form-group">
                            <textarea
                              value={responseMessage}
                              onChange={(e) =>
                                setResponseMessage(e.target.value)
                              }
                              placeholder="Type your response..."
                              rows={3}
                              required
                            />
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'flex-end',
                            }}
                          >
                            <button
                              type="submit"
                              className="btn btn-primary btn-sm"
                              disabled={
                                respondingId === selectedQuestion.id ||
                                !responseMessage.trim()
                              }
                            >
                              {respondingId === selectedQuestion.id
                                ? 'Sending...'
                                : 'Send Response'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
