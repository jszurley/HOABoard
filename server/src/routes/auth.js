const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const brevo = require('../config/brevo');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('an uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('a lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('a number');
  return errors;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: `Password must contain ${passwordErrors.join(', ')}`
      });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const sanitizedName = name.trim().slice(0, 255);
    const user = await User.create(email.toLowerCase(), password, sanitizedName);

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await User.comparePassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const communities = await User.getCommunities(req.user.id);
    res.json({ user, communities });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// GET /api/auth/profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// PUT /api/auth/profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    if (email.toLowerCase() !== req.user.email) {
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const user = await User.updateProfile(req.user.id, { name: name.trim(), email, phone });
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/auth/profile/password
router.put('/profile/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByEmail(req.user.email);
    const isValid = await User.comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: `Password must contain ${passwordErrors.join(', ')}`
      });
    }

    await User.updatePassword(req.user.id, newPassword);
    res.json({ message: 'Password updated' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Always return success to prevent email enumeration
    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.setResetToken(email, tokenHash, expires);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (!process.env.BREVO_API_KEY) {
      console.log('[Auth] Brevo not configured, skipping email to', email);
      console.log('Password reset link:', resetUrl);
    } else {
      try {
        await brevo.transactionalEmails.sendTransacEmail({
          sender: {
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@hoaboard.com',
            name: process.env.BREVO_SENDER_NAME || 'HOABoard'
          },
          to: [{ email, name: user.name }],
          subject: 'HOABoard - Password Reset',
          htmlContent: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="border-bottom: 2px solid #2E7D32; padding-bottom: 12px; margin-bottom: 20px;">
                <h1 style="margin: 0; font-size: 1.25rem; color: #2E7D32;">HOABoard</h1>
              </div>
              <h2 style="margin-top: 0;">Password Reset Request</h2>
              <p>Hi ${user.name},</p>
              <p>You requested a password reset for your HOABoard account.</p>
              <p><a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2E7D32; color: white; text-decoration: none; border-radius: 6px;">Reset Your Password</a></p>
              <p>This link expires in 1 hour.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 0.8rem; color: #6b7280;">
                <p>You're receiving this because a password reset was requested for your HOABoard account.</p>
              </div>
            </div>
          `
        });
      } catch (emailErr) {
        console.error('Email send failed:', emailErr.message);
        console.log('Password reset link (email failed):', resetUrl);
      }
    }

    res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: `Password must contain ${passwordErrors.join(', ')}`
      });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findByResetToken(tokenHash);
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    await User.updatePassword(user.id, password);
    await User.clearResetToken(user.id);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
