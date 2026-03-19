const jwt = require('jsonwebtoken');
const { db } = require('../database/init');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const checkSubscription = (req, res, next) => {
  const userId = req.user.id;

  db.get('SELECT subscription_status, subscription_end_date, subscription_plan FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null;

    // Free plan always allowed; active status check only for paid plans
    if (user.subscription_plan === 'free') {
      return next();
    }

    if (user.subscription_status !== 'active' || (endDate && endDate < now)) {
      return res.status(403).json({
        error: 'Subscription expired or inactive',
        subscription_status: user.subscription_status,
        subscription_end_date: user.subscription_end_date
      });
    }

    next();
  });
};

const checkTripLimit = (req, res, next) => {
  const userId = req.user.id;

  // Get user's plan limits
  db.get(`
    SELECT sp.max_trips, u.subscription_plan
    FROM users u
    JOIN subscription_plans sp ON u.subscription_plan = sp.id
    WHERE u.id = ?
  `, [userId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (result.max_trips === -1) {
      // Unlimited trips
      return next();
    }

    // Count current trips
    db.get('SELECT COUNT(*) as trip_count FROM trips WHERE user_id = ?', [userId], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (countResult.trip_count >= result.max_trips) {
        return res.status(403).json({
          error: 'Trip limit reached for your plan',
          current_trips: countResult.trip_count,
          max_trips: result.max_trips,
          plan: result.subscription_plan
        });
      }

      next();
    });
  });
};

module.exports = {
  authenticateToken,
  checkSubscription,
  checkTripLimit
};