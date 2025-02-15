import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
admin.initializeApp();
const db = getFirestore();

// Make specific user an admin
export const setAdminRole = functions.https.onRequest(async (req, res) => {
  try {
    const email = 'delyank97@gmail.com';
    const user = await admin.auth().getUserByEmail(email);
    
    if (user.uid) {
      // Set custom claims
      await admin.auth().setCustomUserClaims(user.uid, { admin: true });
      
      // Update user document
      await db.collection('users').doc(user.uid).update({
        isAdmin: true,
        role: 'admin'
      });
      
      res.status(200).send(`Successfully set admin role for ${email}`);
    }
  } catch (error) {
    console.error('Error setting admin role:', error);
    res.status(500).send('Error setting admin role');
  }
});

// Security function to clean up inactive users
export const cleanupInactiveUsers = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    const inactiveUsers = await db.collection('users')
      .where('lastSeen', '<', thirtyDaysAgo)
      .where('isAdmin', '==', false)
      .get();
    
    for (const user of inactiveUsers.docs) {
      // Archive user data before deletion
      await db.collection('archivedUsers').doc(user.id).set(user.data());
      await user.ref.delete();
    }
    
    return null;
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
    return null;
  }
});

// Rate limiting for API requests
const rateLimit = new Map<string, { count: number, timestamp: number }>();

export const protectApiEndpoint = functions.https.onRequest(async (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 100; // maximum requests per window
  
  const userRequests = rateLimit.get(ip) || { count: 0, timestamp: now };
  
  if (now - userRequests.timestamp > windowMs) {
    userRequests.count = 0;
    userRequests.timestamp = now;
  }
  
  if (userRequests.count >= maxRequests) {
    res.status(429).send('Too many requests, please try again later');
    return;
  }
  
  userRequests.count++;
  rateLimit.set(ip, userRequests);
  
  // Continue with the request
  res.status(200).send('Request processed');
});

// Monitoring function for suspicious activity
export const monitorSuspiciousActivity = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    if (newData && oldData) {
      // Check for suspicious changes
      const suspiciousChanges = [
        newData.email !== oldData.email,
        newData.role !== oldData.role,
        newData.isAdmin !== oldData.isAdmin
      ].filter(Boolean);
      
      if (suspiciousChanges.length > 0) {
        // Log suspicious activity
        await db.collection('securityLogs').add({
          userId: context.params.userId,
          changes: suspiciousChanges,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          oldData,
          newData
        });
      }
    }
    
    return null;
});
