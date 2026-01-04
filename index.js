const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');

// Initialize Firebase Admin with environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Price ID to product mapping
const PRICE_MAPPINGS = {
  'price_1SlzlbLPyAORHNqqW1GGqcPx': { type: 'attempts', amount: 10 },  // 10 attempts $0.99
  'price_1SlzlnLPyAORHNqq9aX3UYRh': { type: 'attempts', amount: 30 },  // 30 attempts $3.99
  'price_1Slzm1LPyAORHNqqIrYIhq2f': { type: 'subscription', plan: 'pro' }  // Pro subscription $5.99
};

// CORS middleware
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
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Webhook needs raw body, other routes need JSON
app.use((req, res, next) => {
  if (req.originalUrl === '/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Create checkout session
app.post('/create-checkout-session', async (req, res) => {
  console.log('=== CHECKOUT SESSION REQUEST RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request body:', JSON.stringify(req.body));
  
  try {
    const { priceId, mode, userEmail } = req.body;

    console.log('Parsed values:');
    console.log('- priceId:', priceId);
    console.log('- mode:', mode);
    console.log('- userEmail:', userEmail);

    if (!priceId) {
      console.error('❌ ERROR: Missing priceId');
      return res.status(400).json({ error: 'priceId is required' });
    }

    if (!userEmail) {
      console.error('❌ ERROR: Missing userEmail');
      return res.status(400).json({ error: 'userEmail is required' });
    }

    const sessionMode = mode || 'payment';
    console.log('✅ Validation passed. Creating Stripe session...');
    console.log('Session mode:', sessionMode);

    const session = await stripe.checkout.sessions.create({
      mode: sessionMode,
      payment_method_types: ['card'],
      customer_email: userEmail,
      client_reference_id: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'https://topseat.us/success.html',
      cancel_url: 'https://topseat.us/cancel.html',
      metadata: {
        userEmail: userEmail,
        priceId: priceId
      }
    });

    console.log('✅ Stripe session created successfully!');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('❌ ERROR creating checkout session:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Find user by email
async function findUserByEmail(email) {
  try {
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      return null;
    }
    
    const userDoc = usersSnapshot.docs[0];
    return {
      id: userDoc.id,
      data: userDoc.data()
    };
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
}

// Add bonus attempts
async function addBonusAttempts(userId, amount) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        uid: userId,
        bonusAttempts: amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const currentBonus = userDoc.data().bonusAttempts || 0;
      await userRef.update({
        bonusAttempts: currentBonus + amount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log(`✅ Added ${amount} bonus attempts to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error adding bonus attempts:', error);
    return false;
  }
}

// Update subscription
async function updateSubscriptionStatus(userId, status) {
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      await userRef.set({
        uid: userId,
        subscriptionStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await userRef.update({
        subscriptionStatus: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    console.log(`✅ Updated subscription to ${status} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error updating subscription:', error);
    return false;
  }
}

// Webhook endpoint
app.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔔 WEBHOOK EVENT RECEIVED:', event.type);
  console.log('Timestamp:', new Date().toISOString());
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('💳 Processing successful payment...');
        
        const session = event.data.object;
        console.log('Session ID:', session.id);
        console.log('Payment status:', session.payment_status);
        
        const userEmail = session.customer_email || session.client_reference_id;
        const priceId = session.metadata?.priceId;
        
        console.log('User email:', userEmail);
        console.log('Price ID:', priceId);
        
        if (!userEmail) {
          console.error('❌ ERROR: No user email found in session');
          break;
        }
        
        if (!priceId) {
          console.error('❌ ERROR: No price ID found in metadata');
          break;
        }
        
        console.log('🔍 Looking up user in Firestore...');
        const user = await findUserByEmail(userEmail);
        
        if (!user) {
          console.error('❌ ERROR: User not found in Firestore:', userEmail);
          break;
        }
        
        console.log('✅ Found user:', user.id);
        console.log('User data:', JSON.stringify(user.data));
        
        console.log('🔍 Looking up product info...');
        const productInfo = PRICE_MAPPINGS[priceId];
        
        if (!productInfo) {
          console.error('❌ ERROR: Unknown price ID:', priceId);
          console.log('Available price IDs:', Object.keys(PRICE_MAPPINGS));
          break;
        }
        
        console.log('✅ Product info:', JSON.stringify(productInfo));
        
        // Update Firestore based on product type
        if (productInfo.type === 'attempts') {
          console.log(`📦 Adding ${productInfo.amount} bonus attempts...`);
          const success = await addBonusAttempts(user.id, productInfo.amount);
          if (success) {
            console.log(`✅ SUCCESS: Added ${productInfo.amount} bonus attempts to ${userEmail}`);
          } else {
            console.error(`❌ FAILED: Could not add bonus attempts`);
          }
        } else if (productInfo.type === 'subscription') {
          console.log(`⭐ Activating ${productInfo.plan} subscription...`);
          const success = await updateSubscriptionStatus(user.id, 'active');
          if (success) {
            console.log(`✅ SUCCESS: Activated ${productInfo.plan} subscription for ${userEmail}`);
          } else {
            console.error(`❌ FAILED: Could not activate subscription`);
          }
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Webhook processing completed successfully');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        break;
      }
      
      case 'customer.subscription.deleted': {
        console.log('❌ Processing subscription cancellation...');
        
        const subscription = event.data.object;
        console.log('Subscription ID:', subscription.id);
        console.log('Customer ID:', subscription.customer);
        
        const customer = await stripe.customers.retrieve(subscription.customer);
        console.log('Customer email:', customer.email);
        
        if (customer.email) {
          const user = await findUserByEmail(customer.email);
          if (user) {
            console.log('✅ Found user:', user.id);
            await updateSubscriptionStatus(user.id, 'cancelled');
            console.log(`✅ Deactivated subscription for ${customer.email}`);
          } else {
            console.error('❌ User not found:', customer.email);
          }
        }
        break;
      }
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('❌ ERROR processing webhook:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }

  res.json({received: true});
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
