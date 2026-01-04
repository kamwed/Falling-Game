const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS middleware - allow requests from your frontend
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://topseat.us',
    'https://www.topseat.us',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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

    console.log('Received checkout request:', { priceId, mode });

    if (!priceId) {
      console.log('Error: No priceId provided');
      return res.status(400).json({ error: 'priceId is required' });
    }

    // Determine mode: 'subscription' for recurring, 'payment' for one-time
    const sessionMode = mode || 'payment';
    console.log('Using mode:', sessionMode);

    console.log('Creating Stripe session with:', {
      mode: sessionMode,
      priceId: priceId,
      quantity: 1
    });

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

    console.log('Stripe session created successfully:', {
      id: session.id,
      url: session.url
    });

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    console.error('Error details:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });
    res.status(500).json({ 
      error: error.message,
      type: error.type,
      code: error.code
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
