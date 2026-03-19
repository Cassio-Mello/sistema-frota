const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required' });
    }

    // Check if user exists
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      db.run(`
        INSERT INTO users (email, password, name, company, subscription_plan, subscription_status, subscription_end_date)
        VALUES (?, ?, ?, ?, 'free', 'active', ?)
      `, [email, hashedPassword, name, company, nextMonth.toISOString()], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Error creating user' });
        }

        const token = jwt.sign(
          { id: this.lastID, email, name },
          process.env.JWT_SECRET,
          { expiresIn: '7d' }
        );

        res.status(201).json({
          message: 'User created successfully',
          token,
          user: { id: this.lastID, email, name, company, subscription_plan: 'free' }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company,
        subscription_status: user.subscription_status,
        subscription_plan: user.subscription_plan,
        subscription_end_date: user.subscription_end_date
      }
    });
  });
});

// Get current user profile
router.get('/profile', authenticateToken, (req, res) => {
  db.get(`
    SELECT id, email, name, company, subscription_status, subscription_plan, subscription_end_date, created_at
    FROM users WHERE id = ?
  `, [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  });
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  const { name, company } = req.body;

  db.run(
    'UPDATE users SET name = ?, company = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, company, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating profile' });
      }

      res.json({ message: 'Profile updated successfully' });
    }
  );
});

module.exports = router;