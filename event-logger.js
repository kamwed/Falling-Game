/**
 * Event Logging System for Sky Fall Analytics
 * 
 * Logs gameplay events to Firestore for analytics tracking.
 * Events include: game starts, score submissions, rivalry joins, etc.
 */

import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

let db = null;

/**
 * Initialize the event logger with Firestore instance
 * @param {Firestore} firestoreInstance - Firestore database instance
 */
export function initEventLogger(firestoreInstance) {
    db = firestoreInstance;
    console.log('📊 Event logger initialized');
}

/**
 * Log an event to Firestore
 * 
 * @param {Object} params - Event parameters
 * @param {string} params.eventType - Type of event (e.g., 'game_started', 'score_submitted', 'joined_rivalries')
 * @param {string} [params.userId] - User ID (if authenticated)
 * @param {string} [params.email] - User email (if available)
 * @param {string} [params.school] - User's school (if set)
 * @param {string} [params.frat] - User's fraternity/sorority (if set)
 * @param {number} [params.score] - Score for score_submitted events
 * @param {number} [params.level] - Level reached
 * @param {number} [params.coins] - Coins collected
 * @param {Object} [params.metadata] - Additional event-specific data
 * 
 * @returns {Promise<string>} Document ID of the logged event
 */
export async function logEvent({
    eventType,
    userId = null,
    email = null,
    school = null,
    frat = null,
    score = null,
    level = null,
    coins = null,
    metadata = {}
}) {
    if (!db) {
        console.error('❌ Event logger not initialized');
        return null;
    }

    try {
        // Build event document
        const eventDoc = {
            eventType,
            timestamp: serverTimestamp(),
            userId: userId || 'anonymous',
            email: email || null,
            school: school || null,
            frat: frat || null,
            // Add optional fields only if they have values
            ...(score !== null && { score }),
            ...(level !== null && { level }),
            ...(coins !== null && { coins }),
            // Add any additional metadata
            ...metadata
        };

        // Write to Firestore events collection
        const docRef = await addDoc(collection(db, 'events'), eventDoc);

        console.log(`📊 Event logged: ${eventType}`, {
            id: docRef.id,
            userId: userId || 'anonymous',
            ...(score !== null && { score }),
            ...(school && { school }),
            ...(frat && { frat })
        });

        return docRef.id;
    } catch (error) {
        console.error('❌ Error logging event:', error);
        console.error('Event details:', { eventType, userId, score, school, frat });
        return null;
    }
}

/**
 * Get user context (userId, email, school, frat) from Firestore user document
 * 
 * @param {Object} user - Firebase Auth user object
 * @param {Firestore} db - Firestore instance
 * @returns {Promise<Object>} User context object
 */
export async function getUserContext(user, db) {
    if (!user) {
        return {
            userId: null,
            email: null,
            school: null,
            frat: null
        };
    }

    try {
        const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js");
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
                userId: user.uid,
                email: user.email || userData.email || null,
                school: userData.school || null,
                frat: userData.frat || null
            };
        }

        return {
            userId: user.uid,
            email: user.email,
            school: null,
            frat: null
        };
    } catch (error) {
        console.error('❌ Error getting user context:', error);
        return {
            userId: user.uid,
            email: user.email,
            school: null,
            frat: null
        };
    }
}

/**
 * Convenience function: Log game started event
 * 
 * @param {Object} userContext - User context from getUserContext()
 * @param {number} level - Starting level
 */
export async function logGameStarted(userContext, level = 1) {
    return await logEvent({
        eventType: 'game_started',
        ...userContext,
        level,
        metadata: {
            timestamp_client: new Date().toISOString()
        }
    });
}

/**
 * Convenience function: Log score submitted event
 * 
 * @param {Object} userContext - User context from getUserContext()
 * @param {number} score - Final score
 * @param {number} level - Level reached
 * @param {number} coins - Coins collected
 */
export async function logScoreSubmitted(userContext, score, level, coins) {
    return await logEvent({
        eventType: 'score_submitted',
        ...userContext,
        score,
        level,
        coins,
        metadata: {
            timestamp_client: new Date().toISOString()
        }
    });
}

/**
 * Convenience function: Log joined rivalries event
 * 
 * @param {Object} userContext - User context from getUserContext()
 */
export async function logJoinedRivalries(userContext) {
    return await logEvent({
        eventType: 'joined_rivalries',
        ...userContext,
        metadata: {
            timestamp_client: new Date().toISOString()
        }
    });
}
