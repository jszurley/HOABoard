import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPotlucks,
  createPotluck,
  getPotluck,
  updatePotluck,
  deletePotluck,
  createPotluckSignup,
  updatePotluckSignup,
  deletePotluckSignup
} from '../services/api';

const CATEGORIES = ['appetizer', 'side', 'main', 'dessert', 'drink', 'other'];

const MAX_FIELD_MAP = {
  appetizer: 'max_appetizers',
  side: 'max_sides',
  main: 'max_mains',
  dessert: 'max_desserts',
  drink: 'max_drinks',
  other: 'max_other'
};

const CATEGORY_LABELS = {
  appetizer: 'Appetizers',
  side: 'Sides',
  main: 'Mains',
  dessert: 'Desserts',
  drink: 'Drinks',
  other: 'Other'
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

const emptyPotluckForm = {
  title: '',
  description: '',
  theme: '',
  event_date: '',
  event_time: '',
  location: '',
  max_appetizers: '',
  max_sides: '',
  max_mains: '',
  max_desserts: '',
  max_drinks: '',
  max_other: ''
};

const emptySignupForm = {
  dish_name: '',
  category: 'appetizer',
  notes: ''
};

export default function Potlucks() {
  const { communityId } = useParams();
  const { user, isCommunityAdmin, isBoardMember } = useAuth();

  // View state
  const [view, setView] = useState('list'); // 'list' or 'detail'
  const [selectedPotluckId, setSelectedPotluckId] = useState(null);

  // Data
  const [potlucks, setPotlucks] = useState([]);
  const [potluckDetail, setPotluckDetail] = useState(null);

  // UI state
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Potluck modal
  const [showPotluckModal, setShowPotluckModal] = useState(false);
  const [potluckForm, setPotluckForm] = useState(emptyPotluckForm);
  const [editingPotluckId, setEditingPotluckId] = useState(null);
  const [potluckSubmitting, setPotluckSubmitting] = useState(false);

  // Signup modal
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupForm, setSignupForm] = useState(emptySignupForm);
  const [editingSignupId, setEditingSignupId] = useState(null);
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  const isAdmin = isCommunityAdmin(communityId);

  useEffect(() => {
    loadPotlucks();
  }, [communityId]);

  useEffect(() => {
    if (selectedPotluckId) {
      loadPotluckDetail(selectedPotluckId);
    }
  }, [selectedPotluckId]);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const loadPotlucks = async () => {
    try {
      const { data } = await getPotlucks(communityId);
      setPotlucks(data);
    } catch {
      setError('Failed to load potluck events');
    } finally {
      setLoading(false);
    }
  };

  const loadPotluckDetail = async (id) => {
    setDetailLoading(true);
    try {
      const { data } = await getPotluck(communityId, id);
      setPotluckDetail(data);
    } catch {
      setError('Failed to load potluck details');
      setView('list');
      setSelectedPotluckId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openDetailView = (potluck) => {
    setSelectedPotluckId(potluck.id);
    setView('detail');
    setError('');
    setSuccess('');
  };

  const backToList = () => {
    setView('list');
    setSelectedPotluckId(null);
    setPotluckDetail(null);
    setError('');
    setSuccess('');
    loadPotlucks();
  };

  // --- Potluck CRUD ---

  const openCreatePotluck = () => {
    setPotluckForm(emptyPotluckForm);
    setEditingPotluckId(null);
    setShowPotluckModal(true);
  };

  const openEditPotluck = (potluck) => {
    setPotluckForm({
      title: potluck.title || '',
      description: potluck.description || '',
      theme: potluck.theme || '',
      event_date: potluck.event_date ? potluck.event_date.slice(0, 10) : '',
      event_time: potluck.event_time || '',
      location: potluck.location || '',
      max_appetizers: potluck.max_appetizers ?? '',
      max_sides: potluck.max_sides ?? '',
      max_mains: potluck.max_mains ?? '',
      max_desserts: potluck.max_desserts ?? '',
      max_drinks: potluck.max_drinks ?? '',
      max_other: potluck.max_other ?? ''
    });
    setEditingPotluckId(potluck.id);
    setShowPotluckModal(true);
  };

  const closePotluckModal = () => {
    setShowPotluckModal(false);
    setPotluckForm(emptyPotluckForm);
    setEditingPotluckId(null);
  };

  const handlePotluckFormChange = (e) => {
    const { name, value } = e.target;
    setPotluckForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePotluckSubmit = async (e) => {
    e.preventDefault();
    setPotluckSubmitting(true);
    setError('');

    const payload = {
      title: potluckForm.title.trim(),
      description: potluckForm.description.trim(),
      theme: potluckForm.theme.trim(),
      event_date: potluckForm.event_date,
      event_time: potluckForm.event_time,
      location: potluckForm.location.trim()
    };

    // Add max limits only if provided
    CATEGORIES.forEach(cat => {
      const field = MAX_FIELD_MAP[cat];
      const val = potluckForm[field];
      payload[field] = val !== '' ? parseInt(val, 10) : null;
    });

    try {
      if (editingPotluckId) {
        await updatePotluck(communityId, editingPotluckId, payload);
        setSuccess('Potluck event updated successfully');
        if (view === 'detail') {
          loadPotluckDetail(editingPotluckId);
        }
      } else {
        await createPotluck(communityId, payload);
        setSuccess('Potluck event created successfully');
      }
      closePotluckModal();
      loadPotlucks();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save potluck event');
    } finally {
      setPotluckSubmitting(false);
    }
  };

  const handleDeletePotluck = async (potluck) => {
    if (!confirm(`Delete "${potluck.title}"? This will also remove all signups.`)) return;
    try {
      await deletePotluck(communityId, potluck.id);
      setSuccess('Potluck event deleted');
      if (view === 'detail') {
        backToList();
      } else {
        loadPotlucks();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete potluck event');
    }
  };

  // --- Signup CRUD ---

  const getSignupsForCategory = (category) => {
    if (!potluckDetail?.signups) return [];
    return potluckDetail.signups.filter(s => s.category === category);
  };

  const getCategoryLimit = (category) => {
    if (!potluckDetail) return null;
    const field = MAX_FIELD_MAP[category];
    return potluckDetail[field] ?? null;
  };

  const isCategoryFull = (category) => {
    const limit = getCategoryLimit(category);
    if (limit === null || limit === undefined) return false;
    return getSignupsForCategory(category).length >= limit;
  };

  const userHasSignup = () => {
    if (!potluckDetail?.signups || !user) return false;
    return potluckDetail.signups.some(s => s.user_id === user.id);
  };

  const openCreateSignup = () => {
    setSignupForm(emptySignupForm);
    setEditingSignupId(null);
    setShowSignupModal(true);
  };

  const openEditSignup = (signup) => {
    setSignupForm({
      dish_name: signup.dish_name || '',
      category: signup.category || 'appetizer',
      notes: signup.notes || ''
    });
    setEditingSignupId(signup.id);
    setShowSignupModal(true);
  };

  const closeSignupModal = () => {
    setShowSignupModal(false);
    setSignupForm(emptySignupForm);
    setEditingSignupId(null);
  };

  const handleSignupFormChange = (e) => {
    const { name, value } = e.target;
    setSignupForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setSignupSubmitting(true);
    setError('');

    const payload = {
      dish_name: signupForm.dish_name.trim(),
      category: signupForm.category,
      notes: signupForm.notes.trim()
    };

    try {
      if (editingSignupId) {
        await updatePotluckSignup(communityId, selectedPotluckId, editingSignupId, payload);
        setSuccess('Signup updated successfully');
      } else {
        await createPotluckSignup(communityId, selectedPotluckId, payload);
        setSuccess('Signed up successfully!');
      }
      closeSignupModal();
      loadPotluckDetail(selectedPotluckId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save signup');
    } finally {
      setSignupSubmitting(false);
    }
  };

  const handleDeleteSignup = async (signup) => {
    if (!confirm(`Remove "${signup.dish_name}" from the signup list?`)) return;
    try {
      await deletePotluckSignup(communityId, selectedPotluckId, signup.id);
      setSuccess('Signup removed');
      loadPotluckDetail(selectedPotluckId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove signup');
    }
  };

  const canEditSignup = (signup) => {
    return signup.user_id === user?.id || isAdmin;
  };

  // --- Rendering ---

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  const renderPotluckModal = () => {
    if (!showPotluckModal) return null;
    return (
      <div className="modal-overlay" onClick={closePotluckModal}>
        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h2>{editingPotluckId ? 'Edit Potluck Event' : 'Create Potluck Event'}</h2>
            <button className="modal-close" onClick={closePotluckModal}>&times;</button>
          </div>
          <form onSubmit={handlePotluckSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={potluckForm.title}
                onChange={handlePotluckFormChange}
                required
                placeholder="e.g., Summer BBQ Potluck"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={potluckForm.description}
                onChange={handlePotluckFormChange}
                rows={3}
                placeholder="Tell everyone about this potluck..."
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Theme</label>
                <input
                  type="text"
                  name="theme"
                  value={potluckForm.theme}
                  onChange={handlePotluckFormChange}
                  placeholder="e.g., Mexican Fiesta"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={potluckForm.location}
                  onChange={handlePotluckFormChange}
                  placeholder="e.g., Community Clubhouse"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  name="event_date"
                  value={potluckForm.event_date}
                  onChange={handlePotluckFormChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input
                  type="time"
                  name="event_time"
                  value={potluckForm.event_time}
                  onChange={handlePotluckFormChange}
                />
              </div>
            </div>

            <div className="mt-1 mb-1">
              <label style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                Category Limits (optional)
              </label>
              <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                Set maximum number of dishes per category. Leave blank for unlimited.
              </p>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Max Appetizers</label>
                <input
                  type="number"
                  name="max_appetizers"
                  value={potluckForm.max_appetizers}
                  onChange={handlePotluckFormChange}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
              <div className="form-group">
                <label>Max Sides</label>
                <input
                  type="number"
                  name="max_sides"
                  value={potluckForm.max_sides}
                  onChange={handlePotluckFormChange}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Max Mains</label>
                <input
                  type="number"
                  name="max_mains"
                  value={potluckForm.max_mains}
                  onChange={handlePotluckFormChange}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
              <div className="form-group">
                <label>Max Desserts</label>
                <input
                  type="number"
                  name="max_desserts"
                  value={potluckForm.max_desserts}
                  onChange={handlePotluckFormChange}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Max Drinks</label>
                <input
                  type="number"
                  name="max_drinks"
                  value={potluckForm.max_drinks}
                  onChange={handlePotluckFormChange}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
              <div className="form-group">
                <label>Max Other</label>
                <input
                  type="number"
                  name="max_other"
                  value={potluckForm.max_other}
                  onChange={handlePotluckFormChange}
                  min="0"
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closePotluckModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={potluckSubmitting}>
                {potluckSubmitting ? 'Saving...' : editingPotluckId ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderSignupModal = () => {
    if (!showSignupModal) return null;

    // When editing, allow the current category even if full (user already occupies a slot)
    const isEditingThisCategory = (cat) => {
      if (!editingSignupId) return false;
      const existing = potluckDetail?.signups?.find(s => s.id === editingSignupId);
      return existing?.category === cat;
    };

    return (
      <div className="modal-overlay" onClick={closeSignupModal}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{editingSignupId ? 'Edit Signup' : 'Sign Up to Bring a Dish'}</h2>
            <button className="modal-close" onClick={closeSignupModal}>&times;</button>
          </div>
          <form onSubmit={handleSignupSubmit}>
            <div className="form-group">
              <label>Dish Name *</label>
              <input
                type="text"
                name="dish_name"
                value={signupForm.dish_name}
                onChange={handleSignupFormChange}
                required
                placeholder="e.g., Grandma's Potato Salad"
              />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={signupForm.category}
                onChange={handleSignupFormChange}
                required
              >
                {CATEGORIES.map(cat => {
                  const limit = getCategoryLimit(cat);
                  const count = getSignupsForCategory(cat).length;
                  const full = isCategoryFull(cat) && !isEditingThisCategory(cat);
                  return (
                    <option key={cat} value={cat} disabled={full}>
                      {CATEGORY_LABELS[cat]}
                      {limit !== null ? ` (${count}/${limit})` : ` (${count})`}
                      {full ? ' - FULL' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea
                name="notes"
                value={signupForm.notes}
                onChange={handleSignupFormChange}
                rows={2}
                placeholder="Allergen info, serving size, etc."
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={closeSignupModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={signupSubmitting}>
                {signupSubmitting ? 'Saving...' : editingSignupId ? 'Update Signup' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderListView = () => {
    return (
      <div className="container potlucks-page">
        <div className="page-header flex flex-between flex-center">
          <div>
            <h1>Potluck Dinners</h1>
            <p className="text-muted">{potlucks.length} event{potlucks.length !== 1 ? 's' : ''}</p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" onClick={openCreatePotluck}>
              + New Potluck
            </button>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {potlucks.length === 0 ? (
          <div className="empty-state">
            <h3>No potluck events yet</h3>
            <p>
              {isAdmin
                ? 'Create your first potluck event to get started!'
                : 'Check back later for upcoming community potluck events.'}
            </p>
            {isAdmin && (
              <button className="btn btn-primary" onClick={openCreatePotluck}>
                Create First Potluck
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-2">
            {potlucks.map(potluck => (
              <div
                key={potluck.id}
                className="card potluck-card"
                onClick={() => openDetailView(potluck)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex flex-between flex-center mb-1">
                  <h3 style={{ margin: 0 }}>{potluck.title}</h3>
                  {potluck.theme && (
                    <span className="badge badge-primary">{potluck.theme}</span>
                  )}
                </div>
                {potluck.description && (
                  <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                    {potluck.description.length > 120
                      ? potluck.description.slice(0, 120) + '...'
                      : potluck.description}
                  </p>
                )}
                <div className="potluck-meta">
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                    {formatDate(potluck.event_date)}
                    {potluck.event_time && ` at ${formatTime(potluck.event_time)}`}
                  </div>
                  {potluck.location && (
                    <div className="text-muted" style={{ fontSize: '0.875rem' }}>
                      {potluck.location}
                    </div>
                  )}
                </div>
                {potluck.signup_count !== undefined && (
                  <div className="mt-1">
                    <span className="badge badge-warning">
                      {potluck.signup_count} signup{potluck.signup_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {isAdmin && (
                  <div className="flex gap-1 mt-1" onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => openEditPotluck(potluck)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeletePotluck(potluck)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderDetailView = () => {
    if (detailLoading) {
      return <div className="loading"><div className="spinner"></div></div>;
    }

    if (!potluckDetail) {
      return (
        <div className="container">
          <div className="alert alert-error">Potluck event not found</div>
          <button className="btn btn-outline" onClick={backToList}>Back to List</button>
        </div>
      );
    }

    const signups = potluckDetail.signups || [];
    const totalSignups = signups.length;

    return (
      <div className="container potlucks-page">
        <button className="btn btn-outline mb-1" onClick={backToList}>
          &larr; Back to Potlucks
        </button>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="card">
          <div className="flex flex-between flex-center">
            <div>
              <h1 style={{ margin: 0 }}>{potluckDetail.title}</h1>
              {potluckDetail.theme && (
                <span className="badge badge-primary mt-1" style={{ display: 'inline-block' }}>
                  {potluckDetail.theme}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {isAdmin && (
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => openEditPotluck(potluckDetail)}>
                    Edit Event
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeletePotluck(potluckDetail)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {potluckDetail.description && (
            <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
              {potluckDetail.description}
            </p>
          )}

          <div className="potluck-info-grid mt-1">
            <div className="potluck-info-item">
              <strong>Date:</strong> {formatDate(potluckDetail.event_date)}
            </div>
            {potluckDetail.event_time && (
              <div className="potluck-info-item">
                <strong>Time:</strong> {formatTime(potluckDetail.event_time)}
              </div>
            )}
            {potluckDetail.location && (
              <div className="potluck-info-item">
                <strong>Location:</strong> {potluckDetail.location}
              </div>
            )}
            <div className="potluck-info-item">
              <strong>Total Signups:</strong> {totalSignups}
            </div>
          </div>
        </div>

        <div className="flex flex-between flex-center mt-1 mb-1">
          <h2 style={{ margin: 0 }}>Dish Signups</h2>
          <button
            className="btn btn-primary"
            onClick={openCreateSignup}
          >
            + Bring a Dish
          </button>
        </div>

        <div className="potluck-categories">
          {CATEGORIES.map(cat => {
            const catSignups = getSignupsForCategory(cat);
            const limit = getCategoryLimit(cat);
            const full = isCategoryFull(cat);

            return (
              <div key={cat} className="potluck-category-group card">
                <div className="category-header flex flex-between flex-center">
                  <h3 style={{ margin: 0 }}>{CATEGORY_LABELS[cat]}</h3>
                  <span className={`badge ${full ? 'badge-warning' : 'badge-primary'}`}>
                    {catSignups.length}{limit !== null ? `/${limit}` : ''}
                    {full ? ' FULL' : ''}
                  </span>
                </div>

                {catSignups.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.875rem', padding: '0.5rem 0' }}>
                    No signups yet for this category.
                  </p>
                ) : (
                  <div className="signup-list">
                    {catSignups.map(signup => (
                      <div key={signup.id} className="signup-item">
                        <div className="signup-item-info">
                          <div className="signup-dish-name">{signup.dish_name}</div>
                          <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                            by {signup.user_name || 'Unknown'}
                            {signup.notes && ` - ${signup.notes}`}
                          </div>
                        </div>
                        {canEditSignup(signup) && (
                          <div className="flex gap-1">
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openEditSignup(signup)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteSignup(signup)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      {view === 'list' ? renderListView() : renderDetailView()}
      {renderPotluckModal()}
      {renderSignupModal()}

      <style>{`
        .potluck-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateY(-1px);
          transition: box-shadow 0.2s, transform 0.2s;
        }

        .potluck-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .potluck-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.5rem;
        }

        .potluck-info-item {
          font-size: 0.9rem;
          padding: 0.25rem 0;
        }

        .potluck-categories {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .potluck-category-group {
          padding: 1rem 1.5rem;
        }

        .category-header {
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 0.5rem;
        }

        .signup-list {
          display: flex;
          flex-direction: column;
        }

        .signup-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--border);
        }

        .signup-item:last-child {
          border-bottom: none;
        }

        .signup-item-info {
          flex: 1;
          min-width: 0;
        }

        .signup-dish-name {
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .potluck-info-grid {
            grid-template-columns: 1fr;
          }

          .signup-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}
