const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const tripsRoutes = require('./routes/trips');
const expensesRoutes = require('./routes/expenses');
const reportsRoutes = require('./routes/reports');
const subscriptionRoutes = require('./routes/subscription');
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
// Em dev local, liberar todas as origens (simplifica o debug de start em portas dinâmicas/não fixas)
app.use(cors({
  origin: true,
  credentials: true
}));

// Se quiser ambiente com origens fixas, use o array abaixo e remova no modo de produção
// const allowedOrigins = [
//   process.env.FRONTEND_URL || 'http://localhost:8000',
//   'http://localhost:8080',
//   'http://127.0.0.1:8080',
//   'http://localhost:3000',
//   'http://127.0.0.1:3000',
//   'http://localhost:5500',
//   'http://127.0.0.1:5500'
// ];
// app.use(cors({
//   origin: function(origin, callback) {
//     if (!origin || allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }
//     return callback(new Error('Not allowed by CORS'));
//   },
//   credentials: true
// }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  });
}).catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});