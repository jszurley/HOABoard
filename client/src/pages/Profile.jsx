import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, updatePassword } from '../services/api';
import Avatar from '../components/Avatar';
import './Profile.css';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await getProfile();
      setProfile({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
    } catch {
      setError('Failed to load profile');
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);
    try {
      await updateProfile(profile);
      await refreshUser();
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (passwords.new !== passwords.confirm) {
      setError('New passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await updatePassword({ currentPassword: passwords.current, newPassword: passwords.new });
      setPasswords({ current: '', new: '', confirm: '' });
      setMessage('Password updated successfully');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <Avatar name={user?.name} url={user?.avatar_url} size={56} />
        <h1>My Profile</h1>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="profile-section">
        <h2>Profile Information</h2>
        <form onSubmit={handleProfileSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="profile-section">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={passwords.new} onChange={(e) => setPasswords({ ...passwords, new: e.target.value })} required minLength={6} />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
