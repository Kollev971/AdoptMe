import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import type { FirebaseError } from "firebase/app";
import { getDoc, doc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID'
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

let app;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw new Error("Failed to initialize Firebase. Please check your configuration.");
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Rate limiting configuration
const rateLimits = {
  messageLimit: 50, // messages per minute
  requestLimit: 100, // requests per minute
  lastMessageTimestamp: 0,
  messageCount: 0,
  requestCount: 0,
  lastRequestTimestamp: 0
};

// Rate limiting function
const checkRateLimit = (type: 'message' | 'request'): boolean => {
  const now = Date.now();
  const oneMinute = 60 * 1000;

  if (type === 'message') {
    if (now - rateLimits.lastMessageTimestamp > oneMinute) {
      rateLimits.messageCount = 0;
      rateLimits.lastMessageTimestamp = now;
    }
    if (rateLimits.messageCount >= rateLimits.messageLimit) {
      return false;
    }
    rateLimits.messageCount++;
    return true;
  } else {
    if (now - rateLimits.lastRequestTimestamp > oneMinute) {
      rateLimits.requestCount = 0;
      rateLimits.lastRequestTimestamp = now;
    }
    if (rateLimits.requestCount >= rateLimits.requestLimit) {
      return false;
    }
    rateLimits.requestCount++;
    return true;
  }
};

// Enhanced error handling
const handleFirebaseError = (error: FirebaseError): string => {
  console.error("Firebase operation failed:", error);

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Този имейл вече е регистриран';
    case 'auth/invalid-email':
      return 'Невалиден имейл адрес';
    case 'auth/operation-not-allowed':
      return 'Операцията не е разрешена';
    case 'auth/weak-password':
      return 'Паролата трябва да е поне 6 символа';
    case 'auth/user-disabled':
      return 'Този акаунт е деактивиран';
    case 'auth/user-not-found':
      return 'Няма намерен потребител с този имейл';
    case 'auth/wrong-password':
      return 'Грешна парола';
    case 'auth/too-many-requests':
      return 'Твърде много опити. Моля, опитайте по-късно';
    case 'permission-denied':
      return 'Нямате права за тази операция';
    default:
      return 'Възникна грешка. Моля, опитайте отново';
  }
};

export const sendMessage = async (chatId: string, userId: string, message: string) => {
  try {
    if (!checkRateLimit('message')) {
      throw new Error('Message rate limit exceeded. Please wait before sending more messages.');
    }

    // Sanitize message input
    const sanitizedMessage = message.trim().slice(0, 1000); // Limit message length

    // Update chat metadata in Firestore
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: sanitizedMessage,
        senderId: userId,
        createdAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    // Store message in Firestore subcollection
    const messageCollection = collection(db, 'chats', chatId, 'messages');
    await addDoc(messageCollection, {
      text: sanitizedMessage,
      senderId: userId,
      createdAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

// Function to play notification sound
const notificationSound = new Audio('/notification.mp3');

export const playMessageNotification = () => {
  notificationSound.play().catch(error => {
    console.error('Error playing notification sound:', error);
  });
};

// Function to mark messages as read
export const markMessagesAsRead = async (chatId: string, userId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      [`readBy.${userId}`]: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
};

// Get unread messages count
export const getUnreadMessagesCount = async (userId: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', userId));
    const querySnapshot = await getDocs(q);

    let unreadCount = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (
        data.lastMessage &&
        data.lastMessage.senderId !== userId &&
        (!data.readBy?.[userId] ||
          (data.readBy[userId] &&
            data.lastMessage.createdAt?.toDate() > data.readBy[userId]?.toDate()))
      ) {
        unreadCount++;
      }
    });

    return unreadCount;
  } catch (error) {
    console.error('Error getting unread messages count:', error);
    return 0;
  }
};

// Re-export all necessary Firestore functions
export {
  getFirestore,
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  where,
  addDoc
} from 'firebase/firestore';

export const registerUser = async (email: string, password: string) => {
  try {
    if (!checkRateLimit('request')) {
      throw new Error('Too many registration attempts. Please try again later.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);

      // Create user document in Firestore using setDoc instead of updateDoc
      const userDoc = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDoc, {
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        isAdmin: false,
        role: 'user',
        lastSeen: serverTimestamp()
      });
    }
    return userCredential.user;
  } catch (error: any) {
    throw new Error(handleFirebaseError(error));
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    if (!checkRateLimit('request')) {
      throw new Error('Твърде много опити за влизане. Моля, опитайте по-късно.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      // Update last seen
      const userDoc = doc(db, 'users', userCredential.user.uid);
      await updateDoc(userDoc, {
        lastSeen: serverTimestamp()
      });
    }
    return userCredential.user;
  } catch (error: any) {
    throw new Error(handleFirebaseError(error));
  }
};

// Utility function to verify admin status
export const isUserAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists() && userDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
};