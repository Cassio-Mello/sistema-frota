const express = require('express');
const { db } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Get available subscription plans
router.get('/plans', (req, res) => {
  db.all('SELECT * FROM subscription_plans ORDER BY price ASC', [], (err, plans) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(plans);
  });
});

// Get current user's subscription
router.get('/current', authenticateToken, (req, res) => {
  const query = `
    SELECT u.subscription_plan_id, sp.name, sp.price, sp.max_trips, sp.max_users,
           u.subscription_status, u.subscription_end_date, u.stripe_customer_id
    FROM users u
    LEFT JOIN subscription_plans sp ON u.subscription_plan_id = sp.id
    WHERE u.id = ?
  `;

  db.get(query, [req.user.id], (err, subscription) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(subscription);
  });
});

// Create Stripe checkout session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { planId } = req.body;

  try {
    // Get plan details
    db.get('SELECT * FROM subscription_plans WHERE id = ?', [planId], async (err, plan) => {
      if (err || !plan) {
        return res.status(400).json({ error: 'Invalid plan' });
      }

      // Get user details
      db.get('SELECT email, stripe_customer_id FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        let customer;
        if (user.stripe_customer_id) {
          customer = await stripe.customers.retrieve(user.stripe_customer_id);
        } else {
          customer = await stripe.customers.create({
            email: user.email,
          });
          // Update user with customer ID
          db.run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', [customer.id, req.user.id]);
        }

        const session = await stripe.checkout.sessions.create({
          customer: customer.id,
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'brl',
              product_data: {
                name: plan.name,
                description: `${plan.max_trips} viagens, ${plan.max_users} usuários`,
              },
              unit_amount: Math.round(plan.price * 100), // Convert to cents
            },
            quantity: 1,
          }],
          mode: 'subscription',
          success_url: `${process.env.FRONTEND_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.FRONTEND_URL}/subscription/cancel`,
          metadata: {
            userId: req.user.id.toString(),
            planId: planId.toString()
          }
        });

        res.json({ sessionId: session.id, url: session.url });
      });
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment processing error' });
  }
});

// Handle Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.userId;
      const planId = session.metadata.planId;

      // Update user subscription
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

      db.run(`
        UPDATE users
        SET subscription_plan_id = ?, subscription_status = 'active',
            subscription_end_date = ?, stripe_customer_id = ?
        WHERE id = ?
      `, [planId, endDate.toISOString(), session.customer, userId], (err) => {
        if (err) {
          console.error('Database update error:', err);
        }
      });
    } else if (event.type === 'invoice.payment_succeeded') {
      // Handle successful payment for recurring subscription
      const invoice = event.data.object;
      // Extend subscription by one month
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);

      db.run(`
        UPDATE users
        SET subscription_end_date = ?
        WHERE stripe_customer_id = ?
      `, [endDate.toISOString(), invoice.customer], (err) => {
        if (err) {
          console.error('Database update error:', err);
        }
      });
    } else if (event.type === 'invoice.payment_failed') {
      // Handle failed payment
      const invoice = event.data.object;
      db.run(`
        UPDATE users
        SET subscription_status = 'past_due'
        WHERE stripe_customer_id = ?
      `, [invoice.customer], (err) => {
        if (err) {
          console.error('Database update error:', err);
        }
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Cancel subscription
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    db.get('SELECT stripe_customer_id FROM users WHERE id = ?', [req.user.id], async (err, user) => {
      if (err || !user.stripe_customer_id) {
        return res.status(400).json({ error: 'No active subscription' });
      }

      // Get active subscriptions for this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active'
      });

      if (subscriptions.data.length === 0) {
        return res.status(400).json({ error: 'No active subscription found' });
      }

      // Cancel the subscription
      await stripe.subscriptions.update(subscriptions.data[0].id, {
        cancel_at_period_end: true
      });

      // Update user status
      db.run(`
        UPDATE users
        SET subscription_status = 'canceling'
        WHERE id = ?
      `, [req.user.id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Database update error' });
        }
        res.json({ message: 'Subscription will be canceled at the end of the billing period' });
      });
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;