const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create Stripe checkout session
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { priceId, mode } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    // Determine mode: 'subscription' for recurring, 'payment' for one-time
    const sessionMode = mode || 'payment';

    const session = await stripe.checkout.sessions.create({
      mode: sessionMode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'https://topseat.us/success.html',
      cancel_url: 'https://topseat.us/cancel.html',
    });

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
