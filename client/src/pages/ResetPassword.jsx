import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../services/api';
import './Auth.css';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Invalid Link</h1>
            <p>This password reset link is invalid or has expired.</p>
          </div>
          <div className="auth-footer">
            <Link to="/forgot-password">Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <svg width="48" height="48" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="20" fill="#2E7D32"/>
            <text x="50" y="68" fontFamily="Arial,sans-serif" fontSize="50" fontWeight="bold" fill="white" textAnchor="middle">H</text>
          </svg>
          <h1>Set New Password</h1>
          <p>Enter your new password below</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {success ? (
          <>
            <div className="alert alert-success">
              Your password has been reset successfully.
            </div>
            <div className="auth-footer">
              <Link to="/login">Sign in with your new password</Link>
            </div>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>

            <div className="auth-footer">
              <Link to="/login">Back to Sign In</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
