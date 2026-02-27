import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '../services/api';

const EVENT_TYPE_COLORS = {
  meeting: '#2196F3',
  social: '#4CAF50',
  maintenance: '#FF9800',
  deadline: '#F44336',
  other: '#607D8B',
};

const EVENT_TYPE_LABELS = {
  meeting: 'Meeting',
  social: 'Social',
  maintenance: 'Maintenance',
  deadline: 'Deadline',
  other: 'Other',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseMonth(monthStr) {
  const [year, month] = monthStr.split('-').map(Number);
  return { year, month };
}

function shiftMonth(monthStr, delta) {
  const { year, month } = parseMonth(monthStr);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

const EMPTY_FORM = {
  title: '',
  description: '',
  event_date: '',
  start_time: '',
  end_time: '',
  location: '',
  event_type: 'meeting',
};

export default function Calendar() {
  const { communityId } = useParams();
  const { user, isBoardMember } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(getCurrentMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const today = getTodayString();
  const { year, month } = parseMonth(currentMonth);
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  useEffect(() => {
    loadEvents();
  }, [communityId, currentMonth]);

  const loadEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getCalendarEvents(communityId, currentMonth);
      setEvents(data);
    } catch {
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(shiftMonth(currentMonth, -1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(shiftMonth(currentMonth, 1));
    setSelectedDate(null);
  };

  const handleToday = () => {
    setCurrentMonth(getCurrentMonth());
    setSelectedDate(getTodayString());
  };

  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => e.event_date?.slice(0, 10) === dateStr);
  };

  const selectedDayEvents = selectedDate
    ? events.filter((e) => e.event_date?.slice(0, 10) === selectedDate)
    : [];

  const openCreateModal = (prefillDate) => {
    setEditingEvent(null);
    setForm({
      ...EMPTY_FORM,
      event_date: prefillDate || selectedDate || '',
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date?.slice(0, 10) || '',
      start_time: event.start_time?.slice(0, 5) || '',
      end_time: event.end_time?.slice(0, 5) || '',
      location: event.location || '',
      event_type: event.event_type || 'meeting',
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setFormError('Title is required');
      return;
    }
    if (!form.event_date) {
      setFormError('Date is required');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      if (editingEvent) {
        await updateCalendarEvent(communityId, editingEvent.id, form);
      } else {
        await createCalendarEvent(communityId, form);
      }
      closeModal();
      await loadEvents();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save event');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await deleteCalendarEvent(communityId, eventId);
      await loadEvents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete event');
    }
  };

  const renderCalendarGrid = () => {
    const cells = [];

    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = getEventsForDay(day);
      const isToday = dateStr === today;
      const isSelected = dateStr === selectedDate;

      let className = 'calendar-day';
      if (isToday) className += ' today';
      if (isSelected) className += ' selected';

      cells.push(
        <div key={day} className={className} onClick={() => handleDayClick(day)}>
          <span className="day-number">{day}</span>
          {dayEvents.length > 0 && (
            <div className="day-events">
              {dayEvents.slice(0, 3).map((evt) => (
                <span
                  key={evt.id}
                  className="event-dot"
                  style={{ backgroundColor: EVENT_TYPE_COLORS[evt.event_type] || EVENT_TYPE_COLORS.other }}
                  title={evt.title}
                />
              ))}
              {dayEvents.length > 3 && (
                <span className="event-dot-more">+{dayEvents.length - 3}</span>
              )}
            </div>
          )}
        </div>
      );
    }

    return cells;
  };

  if (loading && events.length === 0) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container calendar-page">
      <style>{`
        .calendar-page {
          max-width: 960px;
          margin: 0 auto;
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .calendar-nav h2 {
          min-width: 200px;
          text-align: center;
          margin: 0;
        }

        .calendar-header {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          text-align: center;
          font-weight: 600;
          font-size: 0.85rem;
          color: #607D8B;
          margin-bottom: 0.25rem;
          padding: 0.5rem 0;
        }

        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e0e0e0;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .calendar-day {
          background: #fff;
          min-height: 80px;
          padding: 0.4rem;
          cursor: pointer;
          position: relative;
          transition: background-color 0.15s;
        }

        .calendar-day:hover {
          background: #f5f5f5;
        }

        .calendar-day.empty {
          background: #fafafa;
          cursor: default;
        }

        .calendar-day.today .day-number {
          background: #2196F3;
          color: #fff;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }

        .calendar-day.selected {
          background: #E3F2FD;
        }

        .calendar-day.selected.today {
          background: #BBDEFB;
        }

        .day-number {
          font-size: 0.85rem;
          display: inline-block;
          margin-bottom: 0.2rem;
        }

        .day-events {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          margin-top: 2px;
        }

        .event-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }

        .event-dot-more {
          font-size: 0.65rem;
          color: #999;
          line-height: 8px;
        }

        .selected-day-panel {
          margin-top: 1.5rem;
        }

        .selected-day-panel h3 {
          margin: 0 0 0.75rem 0;
        }

        .event-card {
          padding: 0.75rem 1rem;
          margin-bottom: 0.5rem;
          border-left: 4px solid #ccc;
          border-radius: 4px;
          background: #fafafa;
        }

        .event-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .event-card-title {
          font-weight: 600;
          font-size: 1rem;
        }

        .event-card-meta {
          font-size: 0.85rem;
          color: #607D8B;
          margin-top: 0.25rem;
        }

        .event-card-meta span {
          margin-right: 1rem;
        }

        .event-card-description {
          font-size: 0.9rem;
          color: #444;
          margin-top: 0.4rem;
        }

        .event-type-badge {
          display: inline-block;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 500;
          color: #fff;
          white-space: nowrap;
        }

        .legend {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 1rem;
          font-size: 0.85rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          display: inline-block;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: #fff;
          border-radius: 8px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 1.5rem;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .modal-header h2 {
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
          padding: 0;
          line-height: 1;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 1.25rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
        }

        .event-actions {
          display: flex;
          gap: 0.25rem;
        }
      `}</style>

      <div className="page-header flex flex-between">
        <h1>Community Calendar</h1>
        {isBoardMember(communityId) && (
          <button className="btn btn-primary" onClick={() => openCreateModal()}>
            Add Event
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="calendar-nav">
          <button className="btn btn-outline btn-sm" onClick={handlePrevMonth}>
            &larr; Prev
          </button>
          <button className="btn btn-outline btn-sm" onClick={handleToday}>
            Today
          </button>
          <h2>
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button className="btn btn-outline btn-sm" onClick={handleNextMonth}>
            Next &rarr;
          </button>
        </div>

        <div className="calendar-header">
          {DAY_NAMES.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="calendar-grid">{renderCalendarGrid()}</div>

        <div className="legend">
          {Object.entries(EVENT_TYPE_COLORS).map(([type, color]) => (
            <div key={type} className="legend-item">
              <span className="legend-dot" style={{ backgroundColor: color }} />
              {EVENT_TYPE_LABELS[type]}
            </div>
          ))}
        </div>
      </div>

      {selectedDate && (
        <div className="selected-day-panel">
          <div className="card">
            <div className="flex flex-between" style={{ marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0 }}>
                Events for{' '}
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h3>
              {isBoardMember(communityId) && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => openCreateModal(selectedDate)}
                >
                  Add Event
                </button>
              )}
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="empty-state">
                <p className="text-muted">No events scheduled for this day.</p>
              </div>
            ) : (
              selectedDayEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="event-card"
                  style={{
                    borderLeftColor:
                      EVENT_TYPE_COLORS[evt.event_type] || EVENT_TYPE_COLORS.other,
                  }}
                >
                  <div className="event-card-header">
                    <span className="event-card-title">{evt.title}</span>
                    <div className="flex gap-1">
                      <span
                        className="event-type-badge"
                        style={{
                          backgroundColor:
                            EVENT_TYPE_COLORS[evt.event_type] || EVENT_TYPE_COLORS.other,
                        }}
                      >
                        {EVENT_TYPE_LABELS[evt.event_type] || 'Other'}
                      </span>
                      {isBoardMember(communityId) && (
                        <div className="event-actions">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditModal(evt)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(evt.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="event-card-meta">
                    {evt.start_time && (
                      <span>
                        {formatTime12h(evt.start_time)}
                        {evt.end_time && ` - ${formatTime12h(evt.end_time)}`}
                      </span>
                    )}
                    {evt.location && <span>{evt.location}</span>}
                  </div>
                  {evt.description && (
                    <div className="event-card-description">{evt.description}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEvent ? 'Edit Event' : 'New Event'}</h2>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Event title"
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Event description (optional)"
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="event_date"
                    value={form.event_date}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Event Type</label>
                  <select
                    name="event_type"
                    value={form.event_type}
                    onChange={handleFormChange}
                  >
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    name="start_time"
                    value={form.start_time}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    name="end_time"
                    value={form.end_time}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleFormChange}
                  placeholder="Event location (optional)"
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? 'Saving...'
                    : editingEvent
                      ? 'Update Event'
                      : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
