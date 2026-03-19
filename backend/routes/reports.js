const express = require('express');
const { db } = require('../database/init');
const { authenticateToken, checkSubscription } = require('../middleware/auth');

const router = express.Router();

// Get reports with filters
router.get('/', authenticateToken, checkSubscription, (req, res) => {
  const { start_date, end_date, month, status } = req.query;
  const userId = req.user.id;

  let dateFilter = '';
  let params = [userId];

  if (month) {
    // Filter by month (YYYY-MM format)
    dateFilter = ' AND t.date_start LIKE ?';
    params.push(`${month}%`);
  } else if (start_date || end_date) {
    if (start_date) {
      dateFilter += ' AND t.date_start >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND t.date_start <= ?';
      params.push(end_date);
    }
  }

  let statusFilter = '';
  if (status) {
    statusFilter = ' AND t.status = ?';
    params.push(status);
  }

  const query = `
    SELECT
      t.*,
      COALESCE(fuel.total_fuel, 0) as total_fuel,
      COALESCE(other.total_other, 0) as total_other_expenses,
      COALESCE(fuel.total_liters, 0) as total_liters
    FROM trips t
    LEFT JOIN (
      SELECT trip_id, SUM(value) as total_fuel, SUM(liters) as total_liters
      FROM fuel_expenses
      GROUP BY trip_id
    ) fuel ON t.id = fuel.trip_id
    LEFT JOIN (
      SELECT trip_id, SUM(value) as total_other
      FROM other_expenses
      GROUP BY trip_id
    ) other ON t.id = other.trip_id
    WHERE t.user_id = ? ${dateFilter} ${statusFilter}
    ORDER BY t.date_start DESC
  `;

  db.all(query, params, (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate summary statistics
    const summary = {
      total_trips: trips.length,
      total_km: trips.reduce((sum, t) => sum + ((t.km_end || t.km_start) - t.km_start), 0),
      total_freight: trips.reduce((sum, t) => sum + t.freight_value, 0),
      total_expenses: trips.reduce((sum, t) => sum + t.total_fuel + t.total_other_expenses, 0),
      total_liters: trips.reduce((sum, t) => sum + t.total_liters, 0),
      net_revenue: 0
    };
    summary.net_revenue = summary.total_freight - summary.total_expenses;

    // Format trips with calculations
    const formattedTrips = trips.map(trip => ({
      id: trip.id,
      plate: trip.plate,
      driver: trip.driver,
      date_start: trip.date_start,
      date_end: trip.date_end,
      km_start: trip.km_start,
      km_end: trip.km_end,
      origin: trip.origin,
      destination: trip.destination,
      freight_value: trip.freight_value,
      status: trip.status,
      total_fuel: trip.total_fuel,
      total_other_expenses: trip.total_other_expenses,
      total_expenses: trip.total_fuel + trip.total_other_expenses,
      net_revenue: trip.freight_value - (trip.total_fuel + trip.total_other_expenses),
      total_liters: trip.total_liters
    }));

    res.json({
      summary,
      trips: formattedTrips
    });
  });
});

// Export CSV
router.get('/export/csv', authenticateToken, checkSubscription, (req, res) => {
  const { start_date, end_date, month, status } = req.query;
  const userId = req.user.id;

  // Reuse the same filtering logic
  let dateFilter = '';
  let params = [userId];

  if (month) {
    dateFilter = ' AND t.date_start LIKE ?';
    params.push(`${month}%`);
  } else if (start_date || end_date) {
    if (start_date) {
      dateFilter += ' AND t.date_start >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateFilter += ' AND t.date_start <= ?';
      params.push(end_date);
    }
  }

  let statusFilter = '';
  if (status) {
    statusFilter = ' AND t.status = ?';
    params.push(status);
  }

  const query = `
    SELECT
      t.id, t.plate, t.driver, t.date_start, t.date_end, t.km_start, t.km_end,
      t.origin, t.destination, t.freight_value, t.status,
      COALESCE(fuel.total_fuel, 0) as total_fuel,
      COALESCE(other.total_other, 0) as total_other_expenses,
      COALESCE(fuel.total_liters, 0) as total_liters
    FROM trips t
    LEFT JOIN (
      SELECT trip_id, SUM(value) as total_fuel, SUM(liters) as total_liters
      FROM fuel_expenses
      GROUP BY trip_id
    ) fuel ON t.id = fuel.trip_id
    LEFT JOIN (
      SELECT trip_id, SUM(value) as total_other
      FROM other_expenses
      GROUP BY trip_id
    ) other ON t.id = other.trip_id
    WHERE t.user_id = ? ${dateFilter} ${statusFilter}
    ORDER BY t.date_start DESC
  `;

  db.all(query, params, (err, trips) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Create CSV content
    const headers = [
      'ID', 'Placa', 'Motorista', 'Data Início', 'Data Fim', 'KM Início', 'KM Fim',
      'Origem', 'Destino', 'Frete', 'Status', 'Combustível', 'Outras Despesas',
      'Total Despesas', 'Receita Líquida', 'Litros'
    ];

    const csvRows = trips.map(trip => [
      trip.id,
      trip.plate,
      trip.driver,
      trip.date_start,
      trip.date_end || '',
      trip.km_start,
      trip.km_end || '',
      trip.origin,
      trip.destination,
      trip.freight_value.toFixed(2),
      trip.status,
      trip.total_fuel.toFixed(2),
      trip.total_other_expenses.toFixed(2),
      (trip.total_fuel + trip.total_other_expenses).toFixed(2),
      (trip.freight_value - (trip.total_fuel + trip.total_other_expenses)).toFixed(2),
      trip.total_liters.toFixed(2)
    ]);

    const csvContent = [headers, ...csvRows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio_frota.csv"');
    res.send(csvContent);
  });
});

module.exports = router;