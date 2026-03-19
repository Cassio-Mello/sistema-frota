const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, checkSubscription } = require('../middleware/auth');

const router = express.Router();

// List expenses by trip
router.get('/', authenticateToken, checkSubscription, (req, res) => {
  const tripId = req.query.trip_id;

  if (!tripId) {
    return res.status(400).json({ error: 'trip_id is required' });
  }

  // Verify trip ownership
  db.get('SELECT id FROM trips WHERE id = ? AND user_id = ?', [tripId, req.user.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    db.all('SELECT * FROM fuel_expenses WHERE trip_id = ? ORDER BY date DESC', [tripId], (err, fuelExpenses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      db.all('SELECT * FROM other_expenses WHERE trip_id = ? ORDER BY date DESC', [tripId], (err, otherExpenses) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const expenses = [
          ...fuelExpenses.map(e => ({ ...e, type: 'fuel' })),
          ...otherExpenses.map(e => ({ ...e, type: e.type }))
        ];

        res.json({ expenses });
      });
    });
  });
});

// Add fuel expense
router.post('/:tripId/fuel', authenticateToken, checkSubscription, (req, res) => {
  const { tripId } = req.params;
  const { place, km, liters, value, date } = req.body;

  if (!place || !km || !liters || !value || !date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Verify trip ownership and status
  db.get('SELECT * FROM trips WHERE id = ? AND user_id = ?', [tripId, req.user.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.status !== 'aberto') {
      return res.status(400).json({ error: 'Can only add expenses to open trips' });
    }

    db.run(`
      INSERT INTO fuel_expenses (trip_id, place, km, liters, value, date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [tripId, place, km, liters, value, date], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error adding fuel expense' });
      }

      res.status(201).json({
        message: 'Fuel expense added successfully',
        expense: {
          id: this.lastID,
          trip_id: tripId,
          place,
          km,
          liters,
          value,
          date
        }
      });
    });
  });
});

// Add other expense
router.post('/:tripId/other', authenticateToken, checkSubscription, (req, res) => {
  const { tripId } = req.params;
  const { type, description, value, date } = req.body;

  if (!type || !value || !date) {
    return res.status(400).json({ error: 'Type, value and date are required' });
  }

  // Special validation for toll (pedagio) - description not required
  if (type !== 'pedagio' && !description) {
    return res.status(400).json({ error: 'Description is required for this expense type' });
  }

  // Verify trip ownership and status
  db.get('SELECT * FROM trips WHERE id = ? AND user_id = ?', [tripId, req.user.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.status !== 'aberto') {
      return res.status(400).json({ error: 'Can only add expenses to open trips' });
    }

    db.run(`
      INSERT INTO other_expenses (trip_id, type, description, value, date)
      VALUES (?, ?, ?, ?, ?)
    `, [tripId, type, description || null, value, date], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error adding expense' });
      }

      res.status(201).json({
        message: 'Expense added successfully',
        expense: {
          id: this.lastID,
          trip_id: tripId,
          type,
          description: description || null,
          value,
          date
        }
      });
    });
  });
});

// Delete fuel expense
router.delete('/fuel/:id', authenticateToken, checkSubscription, (req, res) => {
  const expenseId = req.params.id;

  // Verify ownership through trip
  db.run(`
    DELETE FROM fuel_expenses
    WHERE id = ? AND trip_id IN (
      SELECT id FROM trips WHERE user_id = ?
    )
  `, [expenseId, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting fuel expense' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Fuel expense not found' });
    }

    res.json({ message: 'Fuel expense deleted successfully' });
  });
});

// Delete other expense
router.delete('/other/:id', authenticateToken, checkSubscription, (req, res) => {
  const expenseId = req.params.id;

  // Verify ownership through trip
  db.run(`
    DELETE FROM other_expenses
    WHERE id = ? AND trip_id IN (
      SELECT id FROM trips WHERE user_id = ?
    )
  `, [expenseId, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting expense' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  });
});

module.exports = router;