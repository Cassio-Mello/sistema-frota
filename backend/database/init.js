const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Create tables
const createTables = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      company TEXT,
      subscription_status TEXT DEFAULT 'inactive',
      subscription_plan TEXT DEFAULT 'free',
      subscription_end_date DATETIME,
      stripe_customer_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Trips table
  db.run(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plate TEXT NOT NULL,
      driver TEXT NOT NULL,
      date_start DATE NOT NULL,
      date_end DATE,
      km_start INTEGER NOT NULL,
      km_end INTEGER,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      freight_value REAL NOT NULL,
      status TEXT DEFAULT 'aberto',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Fuel expenses table
  db.run(`
    CREATE TABLE IF NOT EXISTS fuel_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      place TEXT NOT NULL,
      km INTEGER NOT NULL,
      liters REAL NOT NULL,
      value REAL NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    )
  `);

  // Other expenses table
  db.run(`
    CREATE TABLE IF NOT EXISTS other_expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      value REAL NOT NULL,
      date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
    )
  `);

  // Subscription plans table
  db.run(`
    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price_monthly REAL NOT NULL,
      price_yearly REAL NOT NULL,
      features TEXT, -- JSON string
      max_trips INTEGER DEFAULT -1, -- -1 = unlimited
      max_users INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default subscription plans
  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      description: 'Para teste do sistema',
      price_monthly: 0,
      price_yearly: 0,
      features: JSON.stringify(['Até 5 viagens', 'Relatórios básicos', '1 usuário']),
      max_trips: 5,
      max_users: 1
    },
    {
      id: 'basic',
      name: 'Básico',
      description: 'Para pequenas frotas',
      price_monthly: 29.90,
      price_yearly: 299.00,
      features: JSON.stringify(['Viagens ilimitadas', 'Relatórios avançados', 'Até 3 usuários', 'Suporte por email']),
      max_trips: -1,
      max_users: 3
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'Para frotas médias',
      price_monthly: 59.90,
      price_yearly: 599.00,
      features: JSON.stringify(['Tudo do Básico', 'Até 10 usuários', 'API access', 'Suporte prioritário', 'Backup automático']),
      max_trips: -1,
      max_users: 10
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'Para grandes frotas',
      price_monthly: 149.90,
      price_yearly: 1499.00,
      features: JSON.stringify(['Tudo do Premium', 'Usuários ilimitados', 'Integrações customizadas', 'Suporte 24/7', 'SLA garantido']),
      max_trips: -1,
      max_users: -1
    }
  ];

  plans.forEach(plan => {
    db.run(`
      INSERT OR IGNORE INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, max_trips, max_users)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [plan.id, plan.name, plan.description, plan.price_monthly, plan.price_yearly, plan.features, plan.max_trips, plan.max_users]);
  });

  console.log('✅ Database tables created successfully');
};

const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Create tables
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          company TEXT,
          subscription_status TEXT DEFAULT 'inactive',
          subscription_plan TEXT DEFAULT 'free',
          subscription_end_date DATETIME,
          stripe_customer_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating users table:', err);
          reject(err);
          return;
        }
        console.log('✅ Users table created');
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS trips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          plate TEXT NOT NULL,
          driver TEXT NOT NULL,
          date_start DATE NOT NULL,
          date_end DATE,
          km_start INTEGER NOT NULL,
          km_end INTEGER,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          freight_value REAL NOT NULL,
          status TEXT DEFAULT 'aberto',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating trips table:', err);
          reject(err);
          return;
        }
        console.log('✅ Trips table created');
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS fuel_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id INTEGER NOT NULL,
          place TEXT NOT NULL,
          km INTEGER NOT NULL,
          liters REAL NOT NULL,
          value REAL NOT NULL,
          date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating fuel_expenses table:', err);
          reject(err);
          return;
        }
        console.log('✅ Fuel expenses table created');
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS other_expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trip_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          description TEXT,
          value REAL NOT NULL,
          date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('Error creating other_expenses table:', err);
          reject(err);
          return;
        }
        console.log('✅ Other expenses table created');
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          price_monthly REAL NOT NULL,
          price_yearly REAL NOT NULL,
          features TEXT,
          max_trips INTEGER DEFAULT -1,
          max_users INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating subscription_plans table:', err);
          reject(err);
          return;
        }
        console.log('✅ Subscription plans table created');

        // Insert default subscription plans
        const plans = [
          {
            id: 'free',
            name: 'Gratuito',
            description: 'Para teste do sistema',
            price_monthly: 0,
            price_yearly: 0,
            features: JSON.stringify(['Até 5 viagens', 'Relatórios básicos', '1 usuário']),
            max_trips: 5,
            max_users: 1
          },
          {
            id: 'basic',
            name: 'Básico',
            description: 'Para pequenas frotas',
            price_monthly: 29.90,
            price_yearly: 299.00,
            features: JSON.stringify(['Viagens ilimitadas', 'Relatórios avançados', 'Até 3 usuários', 'Suporte por email']),
            max_trips: -1,
            max_users: 3
          },
          {
            id: 'premium',
            name: 'Premium',
            description: 'Para frotas médias',
            price_monthly: 59.90,
            price_yearly: 599.00,
            features: JSON.stringify(['Tudo do Básico', 'Até 10 usuários', 'API access', 'Suporte prioritário', 'Backup automático']),
            max_trips: -1,
            max_users: 10
          },
          {
            id: 'enterprise',
            name: 'Enterprise',
            description: 'Para grandes frotas',
            price_monthly: 149.90,
            price_yearly: 1499.00,
            features: JSON.stringify(['Tudo do Premium', 'Usuários ilimitados', 'Integrações customizadas', 'Suporte 24/7', 'SLA garantido']),
            max_trips: -1,
            max_users: -1
          }
        ];

        let plansInserted = 0;
        plans.forEach(plan => {
          db.run(`
            INSERT OR IGNORE INTO subscription_plans (id, name, description, price_monthly, price_yearly, features, max_trips, max_users)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [plan.id, plan.name, plan.description, plan.price_monthly, plan.price_yearly, plan.features, plan.max_trips, plan.max_users], (err) => {
            if (err) {
              console.error('Error inserting plan:', err);
            } else {
              plansInserted++;
              if (plansInserted === plans.length) {
                console.log('✅ Default subscription plans inserted');
                console.log('✅ Database initialized successfully');
                resolve();
              }
            }
          });
        });
      });
    });
  });
};

module.exports = { db, initDatabase };