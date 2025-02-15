import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const setAdminRole = functions.https.onCall(async (data, context) => {
  // Only allow the specified admin email to be set
  const adminEmail = 'delyank97@gmail.com';
  
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(adminEmail);
    
    // Set admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, {
      admin: true
    });

    // Update user document in Firestore
    await admin.firestore().collection('users').doc(user.uid).update({
      isAdmin: true,
      role: 'admin'
    });

    return {
      result: `Success! ${adminEmail} has been made an admin.`
    };
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Error setting admin role');
  }
});

// Function to handle user presence
export const onUserStatusChanged = functions.database
  .ref('/status/{uid}')
  .onUpdate(async (change, context) => {
    const eventStatus = change.after.val();
    const userStatusFirestoreRef = admin.firestore()
      .collection('users')
      .doc(context.params.uid);

    const statusSnapshot = await change.after.ref.once('value');
    const status = statusSnapshot.val();

    if (status.lastSeen > eventStatus.lastSeen) {
      return null;
    }

    return userStatusFirestoreRef.update({
      isOnline: eventStatus.isOnline,
      lastSeen: new Date(eventStatus.lastSeen)
    });
});
