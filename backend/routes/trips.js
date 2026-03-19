const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, checkSubscription, checkTripLimit } = require('../middleware/auth');

const router = express.Router();

// Get all trips for user
router.get('/', authenticateToken, checkSubscription, (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT t.*,
           (SELECT SUM(fe.value) FROM fuel_expenses fe WHERE fe.trip_id = t.id) as fuel_total,
           (SELECT SUM(oe.value) FROM other_expenses oe WHERE oe.trip_id = t.id) as other_expenses_total
    FROM trips t WHERE t.user_id = ?
  `;
  let params = [req.user.id];

  if (status) {
    query += ' AND t.status = ?';
    params.push(status);
  }

  query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  db.all(query, params, (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate net revenue for each trip
    const tripsWithCalculations = trips.map(trip => ({
      ...trip,
      fuel_total: trip.fuel_total || 0,
      other_expenses_total: trip.other_expenses_total || 0,
      total_expenses: (trip.fuel_total || 0) + (trip.other_expenses_total || 0),
      net_revenue: trip.freight_value - ((trip.fuel_total || 0) + (trip.other_expenses_total || 0))
    }));

    res.json({ trips: tripsWithCalculations });
  });
});

// Get single trip
router.get('/:id', authenticateToken, checkSubscription, (req, res) => {
  const tripId = req.params.id;

  db.get('SELECT * FROM trips WHERE id = ? AND user_id = ?', [tripId, req.user.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    // Get fuel expenses
    db.all('SELECT * FROM fuel_expenses WHERE trip_id = ? ORDER BY date DESC', [tripId], (err, fuelExpenses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get other expenses
      db.all('SELECT * FROM other_expenses WHERE trip_id = ? ORDER BY date DESC', [tripId], (err, otherExpenses) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const totalFuel = fuelExpenses.reduce((sum, exp) => sum + exp.value, 0);
        const totalOther = otherExpenses.reduce((sum, exp) => sum + exp.value, 0);

        res.json({
          trip: {
            ...trip,
            fuel_expenses: fuelExpenses,
            other_expenses: otherExpenses,
            total_expenses: totalFuel + totalOther,
            net_revenue: trip.freight_value - (totalFuel + totalOther)
          }
        });
      });
    });
  });
});

// Create new trip
router.post('/', authenticateToken, checkSubscription, checkTripLimit, (req, res) => {
  const { plate, driver, date_start, km_start, origin, destination, freight_value } = req.body;

  if (!plate || !driver || !date_start || !km_start || !origin || !destination || !freight_value) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.run(`
    INSERT INTO trips (user_id, plate, driver, date_start, km_start, origin, destination, freight_value)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [req.user.id, plate, driver, date_start, km_start, origin, destination, freight_value], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error creating trip' });
    }

    res.status(201).json({
      message: 'Trip created successfully',
      trip: {
        id: this.lastID,
        plate,
        driver,
        date_start,
        km_start,
        origin,
        destination,
        freight_value,
        status: 'aberto'
      }
    });
  });
});

// Update trip
router.put('/:id', authenticateToken, checkSubscription, (req, res) => {
  const tripId = req.params.id;
  const { date_end, km_end, status } = req.body;

  // Verify trip ownership
  db.get('SELECT * FROM trips WHERE id = ? AND user_id = ?', [tripId, req.user.id], (err, trip) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (trip.status === 'fechado') {
      return res.status(400).json({ error: 'Cannot modify closed trip' });
    }

    let updateQuery = 'UPDATE trips SET updated_at = CURRENT_TIMESTAMP';
    let params = [];

    if (date_end) {
      updateQuery += ', date_end = ?';
      params.push(date_end);
    }

    if (km_end) {
      updateQuery += ', km_end = ?';
      params.push(km_end);
    }

    if (status) {
      updateQuery += ', status = ?';
      params.push(status);
    }

    updateQuery += ' WHERE id = ? AND user_id = ?';
    params.push(tripId, req.user.id);

    db.run(updateQuery, params, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating trip' });
      }

      res.json({ message: 'Trip updated successfully' });
    });
  });
});

// Delete trip
router.delete('/:id', authenticateToken, checkSubscription, (req, res) => {
  const tripId = req.params.id;

  db.run('DELETE FROM trips WHERE id = ? AND user_id = ?', [tripId, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error deleting trip' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({ message: 'Trip deleted successfully' });
  });
});

module.exports = router;