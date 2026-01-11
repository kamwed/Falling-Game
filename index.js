const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const admin = require('firebase-admin');
const crypto = require('crypto');

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

// ===== RATE LIMITING HELPERS =====

async function checkSignupRateLimit(ip) {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const signupsRef = db.collection('signupRateLimits').doc(ip);
  const signupsDoc = await signupsRef.get();
  
  if (!signupsDoc.exists()) {
    return { allowed: true, hourly: 0, daily: 0 };
  }
  
  const data = signupsDoc.data();
  const timestamps = data.timestamps || [];
  
  // Filter to get counts
  const hourlyCount = timestamps.filter(t => t > oneHourAgo).length;
  const dailyCount = timestamps.filter(t => t > oneDayAgo).length;
  
  // Rate limits: 5 per hour, 20 per day
  if (hourlyCount >= 5) {
    return { allowed: false, hourly: hourlyCount, daily: dailyCount, reason: 'hourly_limit' };
  }
  
  if (dailyCount >= 20) {
    return { allowed: false, hourly: hourlyCount, daily: dailyCount, reason: 'daily_limit' };
  }
  
  return { allowed: true, hourly: hourlyCount, daily: dailyCount };
}

async function recordSignup(ip) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const signupsRef = db.collection('signupRateLimits').doc(ip);
  const signupsDoc = await signupsRef.get();
  
  let timestamps = [];
  if (signupsDoc.exists()) {
    timestamps = signupsDoc.data().timestamps || [];
  }
  
  // Add current timestamp and filter old ones
  timestamps.push(now);
  timestamps = timestamps.filter(t => t > oneDayAgo);
  
  await signupsRef.set({
    ip: ip,
    timestamps: timestamps,
    lastUpdated: admin.firestore.Timestamp.now()
  });
}

async function checkReferralRateLimit(referrerUid) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const limitsRef = db.collection('referralRateLimits').doc(referrerUid);
  const limitsDoc = await limitsRef.get();
  
  if (!limitsDoc.exists()) {
    return { allowed: true, count: 0 };
  }
  
  const data = limitsDoc.data();
  const timestamps = data.timestamps || [];
  const dailyCount = timestamps.filter(t => t > oneDayAgo).length;
  
  // Max 10 referral rewards per day
  if (dailyCount >= 10) {
    return { allowed: false, count: dailyCount };
  }
  
  return { allowed: true, count: dailyCount };
}

async function recordReferralReward(referrerUid) {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  const limitsRef = db.collection('referralRateLimits').doc(referrerUid);
  const limitsDoc = await limitsRef.get();
  
  let timestamps = [];
  if (limitsDoc.exists()) {
    timestamps = limitsDoc.data().timestamps || [];
  }
  
  timestamps.push(now);
  timestamps = timestamps.filter(t => t > oneDayAgo);
  
  await limitsRef.set({
    uid: referrerUid,
    timestamps: timestamps,
    lastUpdated: admin.firestore.Timestamp.now()
  });
}

// Helper to get client IP
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
}

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

// ===== EMAIL VERIFICATION ENDPOINTS =====

/**
 * POST /api/track-signup
 * Track signup with IP and device ID for abuse prevention
 */
app.post('/api/track-signup', async (req, res) => {
  try {
    const { uid, email, deviceId } = req.body;
    const ip = getClientIp(req);
    
    console.log('📊 Tracking signup:', { uid, email, ip, deviceId });
    
    if (!uid || !email) {
      return res.status(400).json({ 
        error: 'UID and email are required',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Check signup rate limit for this IP
    const rateLimit = await checkSignupRateLimit(ip);
    
    if (!rateLimit.allowed) {
      console.log('❌ Signup rate limit exceeded:', { ip, ...rateLimit });
      return res.status(429).json({
        error: rateLimit.reason === 'hourly_limit' 
          ? 'Too many signups from this location. Please try again in an hour.'
          : 'Daily signup limit reached. Please try again tomorrow.',
        code: 'RATE_LIMIT_EXCEEDED',
        hourly: rateLimit.hourly,
        daily: rateLimit.daily
      });
    }
    
    // Record this signup
    await recordSignup(ip);
    
    // Update user document with IP and device ID
    await db.collection('users').doc(uid).update({
      signupIp: ip,
      deviceId: deviceId || 'unknown',
      lastActivityAt: admin.firestore.Timestamp.now()
    });
    
    console.log('✅ Signup tracked successfully');
    
    res.json({
      success: true,
      rateLimit: {
        hourly: rateLimit.hourly + 1,
        daily: rateLimit.daily + 1
      }
    });
    
  } catch (error) {
    console.error('❌ Error tracking signup:', error);
    res.status(500).json({
      error: 'Failed to track signup',
      code: 'TRACKING_FAILED',
      details: error.message
    });
  }
});

/**
 * POST /api/send-verification-email
 * Send verification email to user after signup
 */
app.post('/api/send-verification-email', async (req, res) => {
  try {
    const { uid, email } = req.body;
    
    console.log('📧 ===== SEND VERIFICATION EMAIL REQUEST =====');
    console.log('Timestamp:', new Date().toISOString());
    console.log('UID:', uid);
    console.log('Email:', email);
    console.log('BREVO_SECRET_KEY exists:', !!process.env.BREVO_SECRET_KEY);
    console.log('BREVO_SECRET_KEY length:', process.env.BREVO_SECRET_KEY?.length);
    
    if (!uid || !email) {
      console.error('❌ Missing parameters');
      return res.status(400).json({ 
        error: 'UID and email are required',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Generate verification token
    const token = generateVerificationToken();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    );
    
    console.log('🔑 Generated token (first 10 chars):', token.substring(0, 10) + '...');
    console.log('⏰ Expires at:', expiresAt.toDate().toISOString());
    
    // Store verification token in Firestore
    await db.collection('emailVerifications').doc(uid).set({
      email: email,
      token: token,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: expiresAt,
      verified: false,
      uid: uid
    });
    
    console.log('✅ Verification token stored in Firestore');
    
    // Generate verification link
    const verificationLink = generateVerificationLink(token);
    console.log('🔗 Verification link:', verificationLink);
    
    // Send email
    console.log('📤 Calling sendVerificationEmail...');
    const emailSent = await sendVerificationEmail(email, verificationLink);
    
    if (!emailSent) {
      console.error('❌ sendVerificationEmail returned false');
      return res.status(500).json({
        error: 'Failed to send verification email',
        code: 'EMAIL_SEND_FAILED'
      });
    }
    
    console.log('✅ ===== VERIFICATION EMAIL SENT SUCCESSFULLY =====');
    
    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
      emailSent: true
    });
    
  } catch (error) {
    console.error('❌ ===== ERROR IN SEND VERIFICATION EMAIL =====');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to send verification email',
      code: 'SEND_VERIFICATION_FAILED',
      details: error.message
    });
  }
});

/**
 * GET /api/verify-email
 * Verify email using token from link
 */
app.get('/api/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    
    console.log('🔍 Email verification attempt with token');
    
    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Verification Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Invalid Verification Link</h1>
          <p>The verification link is missing required information.</p>
          <a href="https://topseat.us" style="color: #2563eb;">Return to Sky Fall</a>
        </body>
        </html>
      `);
    }
    
    // Find verification record by token
    const verificationsRef = db.collection('emailVerifications');
    const snapshot = await verificationsRef.where('token', '==', token).limit(1).get();
    
    if (snapshot.empty) {
      console.log('❌ Invalid or expired token');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Verification Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>❌ Invalid Verification Link</h1>
          <p>This verification link is invalid or has expired.</p>
          <p>Please request a new verification email.</p>
          <a href="https://topseat.us/signup.html" style="color: #2563eb;">Sign Up Again</a>
        </body>
        </html>
      `);
    }
    
    const verificationDoc = snapshot.docs[0];
    const verification = verificationDoc.data();
    
    // Check if already verified
    if (verification.verified) {
      console.log('✅ Email already verified, redirecting');
      return res.redirect('/verification-success.html');
    }
    
    // Check if expired
    const now = Date.now();
    const expiresAt = verification.expiresAt.toMillis();
    
    if (now > expiresAt) {
      console.log('❌ Token expired');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Link Expired</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
          <h1>⏰ Verification Link Expired</h1>
          <p>This verification link has expired (24 hours).</p>
          <p>Please sign up again to receive a new link.</p>
          <a href="https://topseat.us/signup.html" style="color: #2563eb;">Sign Up Again</a>
        </body>
        </html>
      `);
    }
    
    // Mark as verified in verification collection
    await verificationDoc.ref.update({
      verified: true,
      verifiedAt: admin.firestore.Timestamp.now()
    });
    
    // Update user document
    await db.collection('users').doc(verification.uid).update({
      emailVerified: true,
      emailVerifiedAt: admin.firestore.Timestamp.now()
    });
    
    console.log('✅ Email verified successfully for user:', verification.uid);
    
    // Check if user has a referral to process
    const userDoc = await db.collection('users').doc(verification.uid).get();
    const userData = userDoc.data();
    
    if (userData && userData.referredByCode) {
      console.log('🎁 User has referral code, marking as ready to process:', userData.referredByCode);
      
      // Update referral status to "verified" (will be processed after first game)
      await db.collection('users').doc(verification.uid).update({
        referralStatus: 'verified' // Changed from 'pending' to 'verified'
      });
    }
    
    // Redirect to success page
    res.redirect('/verification-success.html');
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Verification Error</title></head>
      <body style="font-family: Arial; text-align: center; padding: 50px;">
        <h1>❌ Verification Failed</h1>
        <p>An error occurred while verifying your email.</p>
        <p>Error: ${error.message}</p>
        <a href="https://topseat.us" style="color: #2563eb;">Return to Sky Fall</a>
      </body>
      </html>
    `);
  }
});

/**
 * POST /api/resend-verification
 * Resend verification email for unverified users
 */
app.post('/api/resend-verification', async (req, res) => {
  try {
    const { uid, email } = req.body;
    
    console.log('📧 Resending verification email:', { uid, email });
    
    if (!uid || !email) {
      return res.status(400).json({
        error: 'UID and email are required',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Check if user exists and is unverified
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists()) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (userDoc.data().emailVerified) {
      return res.status(400).json({
        error: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }
    
    // Generate new token
    const token = generateVerificationToken();
    const expiresAt = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    
    // Update verification record
    await db.collection('emailVerifications').doc(uid).set({
      email: email,
      token: token,
      createdAt: admin.firestore.Timestamp.now(),
      expiresAt: expiresAt,
      verified: false,
      uid: uid
    });
    
    // Send email
    const verificationLink = generateVerificationLink(token);
    const emailSent = await sendVerificationEmail(email, verificationLink);
    
    if (!emailSent) {
      return res.status(500).json({
        error: 'Failed to send verification email',
        code: 'EMAIL_SEND_FAILED'
      });
    }
    
    console.log('✅ Verification email resent successfully');
    
    res.json({
      success: true,
      message: 'Verification email sent! Check your inbox.'
    });
    
  } catch (error) {
    console.error('❌ Error resending verification:', error);
    res.status(500).json({
      error: 'Failed to resend verification email',
      code: 'RESEND_FAILED',
      details: error.message
    });
  }
});

/**
 * POST /api/process-referral-reward
 * Process referral reward with abuse checks
 */
app.post('/api/process-referral-reward', async (req, res) => {
  try {
    const { uid, referrerUid } = req.body;
    
    console.log('🎁 Processing referral reward:', { uid, referrerUid });
    
    if (!uid || !referrerUid) {
      return res.status(400).json({
        error: 'UID and referrer UID are required',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    // Get user and referrer data
    const userDoc = await db.collection('users').doc(uid).get();
    const referrerDoc = await db.collection('users').doc(referrerUid).get();
    
    if (!userDoc.exists() || !referrerDoc.exists()) {
      return res.status(404).json({
        error: 'User or referrer not found',
        code: 'NOT_FOUND'
      });
    }
    
    const userData = userDoc.data();
    const referrerData = referrerDoc.data();
    
    // Check if already rewarded
    if (userData.referralRewarded) {
      return res.status(400).json({
        error: 'Referral already rewarded',
        code: 'ALREADY_REWARDED'
      });
    }
    
    // Check email verification
    if (!userData.emailVerified) {
      return res.status(400).json({
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    // Check referral status
    if (userData.referralStatus !== 'verified') {
      return res.status(400).json({
        error: 'Referral not verified',
        code: 'REFERRAL_NOT_VERIFIED'
      });
    }
    
    // ABUSE CHECK 1: Same IP
    if (userData.signupIp && referrerData.signupIp && 
        userData.signupIp === referrerData.signupIp) {
      console.log('⚠️ Same IP detected, marking as suspicious');
      await db.collection('users').doc(uid).update({
        referralStatus: 'suspicious_same_ip',
        suspiciousFlags: admin.firestore.FieldValue.arrayUnion('same_ip')
      });
      return res.status(400).json({
        error: 'Suspicious referral activity detected',
        code: 'SUSPICIOUS_SAME_IP'
      });
    }
    
    // ABUSE CHECK 2: Same device ID
    if (userData.deviceId && referrerData.deviceId && 
        userData.deviceId === referrerData.deviceId &&
        userData.deviceId !== 'unknown') {
      console.log('⚠️ Same device detected, marking as suspicious');
      await db.collection('users').doc(uid).update({
        referralStatus: 'suspicious_same_device',
        suspiciousFlags: admin.firestore.FieldValue.arrayUnion('same_device')
      });
      return res.status(400).json({
        error: 'Suspicious referral activity detected',
        code: 'SUSPICIOUS_SAME_DEVICE'
      });
    }
    
    // ABUSE CHECK 3: Email similarity (same email with numbers)
    const userEmailBase = userData.email.split('@')[0].replace(/[0-9]/g, '');
    const referrerEmailBase = referrerData.email.split('@')[0].replace(/[0-9]/g, '');
    if (userEmailBase === referrerEmailBase && userEmailBase.length > 3) {
      console.log('⚠️ Similar emails detected, marking as suspicious');
      await db.collection('users').doc(uid).update({
        referralStatus: 'suspicious_similar_email',
        suspiciousFlags: admin.firestore.FieldValue.arrayUnion('similar_email')
      });
      return res.status(400).json({
        error: 'Suspicious referral activity detected',
        code: 'SUSPICIOUS_SIMILAR_EMAIL'
      });
    }
    
    // Check referrer's rate limit (max 10 rewards per day)
    const rateLimit = await checkReferralRateLimit(referrerUid);
    if (!rateLimit.allowed) {
      console.log('❌ Referral rate limit exceeded for referrer:', referrerUid);
      return res.status(429).json({
        error: 'Referral reward limit reached. Maximum 10 per day.',
        code: 'REFERRAL_RATE_LIMIT',
        count: rateLimit.count
      });
    }
    
    // All checks passed - grant reward
    const currentBonus = referrerData.bonusAttempts || 0;
    
    await db.collection('users').doc(referrerUid).update({
      bonusAttempts: currentBonus + 5
    });
    
    await db.collection('users').doc(uid).update({
      referralStatus: 'rewarded',
      referralRewarded: true,
      referralRewardedAt: admin.firestore.Timestamp.now()
    });
    
    // Record this reward for rate limiting
    await recordReferralReward(referrerUid);
    
    console.log('✅ Referral reward granted successfully');
    
    res.json({
      success: true,
      message: 'Referral reward granted',
      bonusAttempts: currentBonus + 5
    });
    
  } catch (error) {
    console.error('❌ Error processing referral reward:', error);
    res.status(500).json({
      error: 'Failed to process referral reward',
      code: 'REWARD_FAILED',
      details: error.message
    });
  }
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
      console.error('âŒ ERROR: Missing priceId');
      return res.status(400).json({ error: 'priceId is required' });
    }

    if (!userEmail) {
      console.error('âŒ ERROR: Missing userEmail');
      return res.status(400).json({ error: 'userEmail is required' });
    }

    const sessionMode = mode || 'payment';
    console.log('âœ… Validation passed. Creating Stripe session...');
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

    console.log('âœ… Stripe session created successfully!');
    console.log('Session ID:', session.id);
    console.log('Session URL:', session.url);

    res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('âŒ ERROR creating checkout session:', error.message);
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
    
    console.log(`âœ… Added ${amount} bonus attempts to user ${userId}`);
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
    
    console.log(`âœ… Updated subscription to ${status} for user ${userId}`);
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
    console.error('âš ï¸ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
  console.log('ðŸ”” WEBHOOK EVENT RECEIVED:', event.type);
  console.log('Timestamp:', new Date().toISOString());
  console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('ðŸ’³ Processing successful payment...');
        
        const session = event.data.object;
        console.log('Session ID:', session.id);
        console.log('Payment status:', session.payment_status);
        
        const userEmail = session.customer_email || session.client_reference_id;
        const priceId = session.metadata?.priceId;
        
        console.log('User email:', userEmail);
        console.log('Price ID:', priceId);
        
        if (!userEmail) {
          console.error('âŒ ERROR: No user email found in session');
          break;
        }
        
        if (!priceId) {
          console.error('âŒ ERROR: No price ID found in metadata');
          break;
        }
        
        console.log('ðŸ” Looking up user in Firestore...');
        const user = await findUserByEmail(userEmail);
        
        if (!user) {
          console.error('âŒ ERROR: User not found in Firestore:', userEmail);
          break;
        }
        
        console.log('âœ… Found user:', user.id);
        console.log('User data:', JSON.stringify(user.data));
        
        console.log('ðŸ” Looking up product info...');
        const productInfo = PRICE_MAPPINGS[priceId];
        
        if (!productInfo) {
          console.error('âŒ ERROR: Unknown price ID:', priceId);
          console.log('Available price IDs:', Object.keys(PRICE_MAPPINGS));
          break;
        }
        
        console.log('âœ… Product info:', JSON.stringify(productInfo));
        
        // Update Firestore based on product type
        if (productInfo.type === 'attempts') {
          console.log(`ðŸ“¦ Adding ${productInfo.amount} bonus attempts...`);
          const success = await addBonusAttempts(user.id, productInfo.amount);
          if (success) {
            console.log(`âœ… SUCCESS: Added ${productInfo.amount} bonus attempts to ${userEmail}`);
          } else {
            console.error(`âŒ FAILED: Could not add bonus attempts`);
          }
        } else if (productInfo.type === 'subscription') {
          console.log(`â­ Activating ${productInfo.plan} subscription...`);
          const success = await updateSubscriptionStatus(user.id, 'active');
          if (success) {
            console.log(`âœ… SUCCESS: Activated ${productInfo.plan} subscription for ${userEmail}`);
          } else {
            console.error(`âŒ FAILED: Could not activate subscription`);
          }
        }
        
        console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
        console.log('âœ… Webhook processing completed successfully');
        console.log('â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”');
        break;
      }
      
      case 'customer.subscription.deleted': {
        console.log('âŒ Processing subscription cancellation...');
        
        const subscription = event.data.object;
        console.log('Subscription ID:', subscription.id);
        console.log('Customer ID:', subscription.customer);
        
        const customer = await stripe.customers.retrieve(subscription.customer);
        console.log('Customer email:', customer.email);
        
        if (customer.email) {
          const user = await findUserByEmail(customer.email);
          if (user) {
            console.log('âœ… Found user:', user.id);
            await updateSubscriptionStatus(user.id, 'cancelled');
            console.log(`âœ… Deactivated subscription for ${customer.email}`);
          } else {
            console.error('âŒ User not found:', customer.email);
          }
        }
        break;
      }
      
      default:
        console.log(`â„¹ï¸ Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('âŒ ERROR processing webhook:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }

  res.json({received: true});
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ===== EMAIL VERIFICATION FUNCTIONS =====

/**
 * Generate secure verification token
 */
function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate verification link
 */
function generateVerificationLink(token) {
  const baseUrl = process.env.BASE_URL || 'https://topseat.us';
  return `${baseUrl}/verify-email?token=${token}`;
}

/**
 * Send verification email using Brevo
 */
async function sendVerificationEmail(email, verificationLink) {
  const BREVO_API_KEY = process.env.BREVO_SECRET_KEY;
  
  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_SECRET_KEY environment variable not set');
    return false;
  }
  
  console.log('📧 Attempting to send email to:', email);
  console.log('🔗 Verification link:', verificationLink);
  
  const emailData = {
    sender: {
      name: 'Sky Fall Game',
      email: 'no-reply@topseat.us'
    },
    to: [
      {
        email: email,
        name: email.split('@')[0]
      }
    ],
    subject: 'Verify Your Sky Fall Account',
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #60a5fa 0%, #2563eb 100%); 
                   color: white; padding: 30px; text-align: center; border-radius: 8px; }
          .content { background: #f9fafb; padding: 30px; margin: 20px 0; border-radius: 8px; }
          .button { display: inline-block; padding: 14px 32px; background: #2563eb; 
                   color: white !important; text-decoration: none; border-radius: 8px; 
                   font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
          .link-text { word-break: break-all; color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: white;">🎮 Welcome to Sky Fall!</h1>
          </div>
          <div class="content">
            <h2 style="color: #1f2937;">Verify Your Email Address</h2>
            <p>Thanks for signing up! Please verify your email address to start playing and earning rewards.</p>
            <p>Click the button below to verify your account:</p>
            <div style="text-align: center;">
              <a href="${verificationLink}" class="button">Verify Email Address</a>
            </div>
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Or copy and paste this link: <br>
              <span class="link-text">${verificationLink}</span>
            </p>
            <p style="margin-top: 20px; color: #dc2626; font-weight: bold;">
              ⚠️ This link expires in 24 hours.
            </p>
          </div>
          <div class="footer">
            <p>If you didn't create this account, you can safely ignore this email.</p>
            <p>© 2026 Sky Fall - Dodge obstacles, collect coins, win prizes!</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  console.log('📤 Sending email via Brevo API...');
  
  return new Promise((resolve) => {
    const https = require('https');
    
    const postData = JSON.stringify(emailData);
    
    const options = {
      hostname: 'api.brevo.com',
      port: 443,
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('📬 Brevo response status:', res.statusCode);
        console.log('📬 Brevo response body:', responseData);
        
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log('✅ Verification email sent successfully to:', email);
          resolve(true);
        } else {
          console.error('❌ Brevo API error:', responseData);
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Error sending verification email:', error);
      console.error('Error details:', error.message);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}
