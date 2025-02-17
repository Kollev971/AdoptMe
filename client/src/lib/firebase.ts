import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, serverTimestamp, setDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import type { FirebaseError } from "firebase/app";
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy } from 'firebase/firestore';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_ADMIN_EMAIL' // Added admin email environment variable
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Липсва задължителна променлива: ${envVar}`);
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

// Initialize Firebase only if not already initialized
let app;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
} catch (error) {
  console.error("Грешка при инициализиране на Firebase:", error);
  throw new Error("Неуспешно инициализиране на Firebase. Моля, проверете конфигурацията.");
}

// Initialize services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Enhanced error handling with Bulgarian translations
const handleFirebaseError = (error: FirebaseError): string => {
  console.error("Firebase операцията не бе успешна:", error);

  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Този имейл вече е регистриран',
    'auth/invalid-email': 'Невалиден имейл адрес',
    'auth/operation-not-allowed': 'Операцията не е разрешена',
    'auth/weak-password': 'Паролата трябва да е поне 6 символа',
    'auth/user-disabled': 'Този акаунт е деактивиран',
    'auth/user-not-found': 'Няма намерен потребител с този имейл',
    'auth/wrong-password': 'Грешна парола',
    'auth/too-many-requests': 'Твърде много опити. Моля, опитайте по-късно',
    'permission-denied': 'Нямате права за тази операция',
    'auth/popup-closed-by-user': 'Прозорецът за вход беше затворен',
    'auth/cancelled-popup-request': 'Заявката за вход беше отказана',
    'auth/popup-blocked': 'Изскачащият прозорец беше блокиран от браузъра',
  };

  return errorMessages[error.code] || 'Възникна неочаквана грешка. Моля, опитайте отново';
};

// Google Sign In
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Check if user exists
    const userDoc = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userDoc);

    if (!userSnapshot.exists()) {
      console.log('Creating new user profile for Google sign-in');
      // Create new user profile with default values
      const userData = {
        email: user.email,
        fullName: user.displayName || '',
        username: user.email?.split('@')[0] || '',
        photoURL: user.photoURL,
        phone: '',
        createdAt: serverTimestamp(),
        isAdmin: user.email === import.meta.env.VITE_ADMIN_EMAIL,
        role: user.email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user',
        lastSeen: serverTimestamp(),
        emailVerified: user.emailVerified
      };

      await setDoc(userDoc, userData);
      console.log('User profile created successfully');

      // Set admin role if needed
      if (user.email === import.meta.env.VITE_ADMIN_EMAIL) {
        try {
          const response = await fetch('/api/admin/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email })
          });

          if (!response.ok) {
            throw new Error('Failed to set admin role');
          }
          console.log('Admin role set successfully');
        } catch (error) {
          console.error('Error setting admin role:', error);
        }
      }
    } else {
      // Update last seen for existing user
      await updateDoc(userDoc, {
        lastSeen: serverTimestamp(),
        photoURL: user.photoURL // Update photo URL in case it changed
      });
      console.log('User profile updated successfully');
    }

    return user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    // Enhanced error handling
    if (error.code === 'auth/popup-blocked') {
      throw new Error('Моля, разрешете изскачащи прозорци за този сайт и опитайте отново');
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Входът беше прекъснат. Моля, опитайте отново');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error('Този домейн не е оторизиран за Firebase Authentication. Моля, свържете се с администратор');
    }
    throw new Error(handleFirebaseError(error));
  }
};

// Rate limiting configuration
const rateLimits = {
  messageLimit: 50, // messages per minute
  requestLimit: 100, // requests per minute
  lastMessageTimestamp: 0,
  messageCount: 0,
  requestCount: 0,
  lastRequestTimestamp: 0,
  loginAttempts: new Map<string, { count: number; timestamp: number }>()
};

// Rate limiting function
const checkRateLimit = (type: 'message' | 'request' | 'login', identifier?: string): boolean => {
  const now = Date.now();
  const oneMinute = 60 * 1000;

  if (type === 'login' && identifier) {
    const attempts = rateLimits.loginAttempts.get(identifier) || { count: 0, timestamp: now };

    // Reset attempts after 15 minutes
    if (now - attempts.timestamp > 15 * oneMinute) {
      attempts.count = 0;
      attempts.timestamp = now;
    }

    // Block after 5 failed attempts
    if (attempts.count >= 5) {
      const remainingTime = Math.ceil((attempts.timestamp + 15 * oneMinute - now) / 60000);
      throw new Error(`Твърде много неуспешни опити. Моля, опитайте отново след ${remainingTime} минути.`);
    }

    attempts.count++;
    attempts.timestamp = now;
    rateLimits.loginAttempts.set(identifier, attempts);
    return true;
  }

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
  }

  if (now - rateLimits.lastRequestTimestamp > oneMinute) {
    rateLimits.requestCount = 0;
    rateLimits.lastRequestTimestamp = now;
  }
  if (rateLimits.requestCount >= rateLimits.requestLimit) {
    return false;
  }
  rateLimits.requestCount++;
  return true;
};


export const registerUser = async (email: string, password: string) => {
  try {
    if (!checkRateLimit('request')) {
      throw new Error('Твърде много опити за регистрация. Моля, опитайте по-късно.');
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);

      // Create user document in Firestore using setDoc instead of updateDoc
      const userDoc = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDoc, {
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        isAdmin: email === import.meta.env.VITE_ADMIN_EMAIL, // Set admin flag based on email
        role: email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user',
        lastSeen: serverTimestamp()
      });

      // If this is the admin email, set custom claims
      if (email === import.meta.env.VITE_ADMIN_EMAIL) {
        // Make an API call to set admin role
        try {
          await fetch('/api/admin/setup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
        } catch (error) {
          console.error('Error setting admin role:', error);
        }
      }
    }
    return userCredential.user;
  } catch (error: any) {
    throw new Error(handleFirebaseError(error));
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    if (!checkRateLimit('login', email)) {
      throw new Error('Твърде много опити за влизане. Моля, опитайте по-късно.');
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      // Reset login attempts on successful login
      rateLimits.loginAttempts.delete(email);

      // Update last seen
      const userDoc = doc(db, 'users', userCredential.user.uid);
      await updateDoc(userDoc, {
        lastSeen: serverTimestamp()
      });
    }
    return userCredential.user;
  } catch (error: any) {
    // Increment failed attempts
    const attempts = rateLimits.loginAttempts.get(email) || { count: 0, timestamp: Date.now() };
    rateLimits.loginAttempts.set(email, {
      count: attempts.count + 1,
      timestamp: Date.now()
    });

    throw new Error(handleFirebaseError(error));
  }
};

// Utility function to verify admin status
export const isUserAdmin = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    // Check both isAdmin flag and email
    return userDoc.exists() && (
      userDoc.data()?.isAdmin === true ||
      userDoc.data()?.email === import.meta.env.VITE_ADMIN_EMAIL
    );
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
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