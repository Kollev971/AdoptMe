import { initializeApp, getApps } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, serverTimestamp, setDoc, updateDoc, doc, getDoc, addDoc, collection } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import type { FirebaseError } from "firebase/app";
import { collection as firestoreCollection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_ADMIN_EMAIL'
] as const;

for (const envVar of requiredEnvVars) {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "doggycat-5b20c.firebaseapp.com",
  databaseURL: "https://doggycat-5b20c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

console.log('Firebase Config:', {
  ...firebaseConfig,
  apiKey: '***'
});

// Initialize Firebase
let app;
try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
  } else {
    app = getApps()[0];
    console.log('Using existing Firebase instance');
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
  throw new Error("Failed to initialize Firebase. Please check configuration.");
}

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

// Error handling with Bulgarian translations
const handleFirebaseError = (error: FirebaseError): string => {
  console.error("Firebase operation failed:", error);

  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'Този имейл вече е регистриран',
    'auth/invalid-email': 'Невалиден имейл адрес',
    'auth/operation-not-allowed': 'Операцията не е разрешена',
    'auth/weak-password': 'Паролата трябва да е поне 6 символа',
    'auth/user-disabled': 'Този акаунт е деактивиран',
    'auth/user-not-found': 'Няма намерен потребител с този имейл',
    'auth/wrong-password': 'Грешна парола',
    'auth/invalid-credential': 'Невалидни данни за вход. Моля, проверете имейла и паролата си.',
    'auth/too-many-requests': 'Твърде много опити. Моля, опитайте по-късно',
    'auth/popup-closed-by-user': 'Прозорецът за вход беше затворен',
    'auth/cancelled-popup-request': 'Заявката за вход беше отказана',
    'auth/popup-blocked': 'Изскачащият прозорец беше блокиран от браузъра',
    'auth/unauthorized-domain': 'Този домейн не е оторизиран за Firebase Authentication',
    'permission-denied': 'Нямате права за тази операция',
  };

  return errorMessages[error.code] || `Възникна неочаквана грешка: ${error.message}`;
};

// Google Sign In
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    console.log('Starting Google sign-in process...');
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Update user data in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const userData = {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName || '',
        username: user.email?.split('@')[0] || '',
        photoURL: user.photoURL,
        phone: '',
        createdAt: serverTimestamp(),
        isAdmin: user.email === import.meta.env.VITE_ADMIN_EMAIL,
        role: user.email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user',
        emailVerified: user.emailVerified
      };

      await setDoc(userRef, userData);
    } else {
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      });
    }

    return user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(handleFirebaseError(error));
  }
};

export const handleGoogleRedirect = async () => {
  try {
    console.log('Processing Google redirect result...');
    const result = await getRedirectResult(auth);

    if (!result) {
      console.log('No redirect result available');
      return null;
    }

    const user = result.user;
    console.log('Google sign-in successful for:', user.email);

    // Update user data in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log('Creating new user profile...');
      const userData = {
        uid: user.uid,
        email: user.email,
        fullName: user.displayName || '',
        username: user.email?.split('@')[0] || '',
        photoURL: user.photoURL,
        phone: '',
        createdAt: serverTimestamp(),
        isAdmin: user.email === import.meta.env.VITE_ADMIN_EMAIL,
        role: user.email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user',
        emailVerified: user.emailVerified
      };

      await setDoc(userRef, userData);
      console.log('User profile created successfully');
    } else {
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      });
    }

    return user;
  } catch (error: any) {
    console.error('Error processing Google redirect:', error);
    throw new Error(handleFirebaseError(error));
  }
};

// User registration
export const registerUser = async (email: string, password: string) => {
  try {
    console.log('Starting user registration...');
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);

      const userDoc = doc(db, 'users', userCredential.user.uid);
      await setDoc(userDoc, {
        email: userCredential.user.email,
        createdAt: serverTimestamp(),
        isAdmin: email === import.meta.env.VITE_ADMIN_EMAIL,
        role: email === import.meta.env.VITE_ADMIN_EMAIL ? 'admin' : 'user',
        lastSeen: serverTimestamp(),
        emailVerified: false
      });
    }
    return userCredential.user;
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(handleFirebaseError(error));
  }
};

// User login
export const loginUser = async (email: string, password: string) => {
  try {
    console.log('Attempting login...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    if (userCredential.user) {
      const userDoc = doc(db, 'users', userCredential.user.uid);
      await updateDoc(userDoc, {
        lastSeen: serverTimestamp()
      });
    }

    return userCredential.user;
  } catch (error: any) {
    console.error('Login error:', error);
    throw new Error(handleFirebaseError(error));
  }
};

// Audio notification for messages
const notificationSound = new Audio('/notification.mp3');

export const playMessageNotification = () => {
  notificationSound.play().catch(error => {
    console.error('Error playing notification sound:', error);
  });
};

// Chat functionality
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

export const sendMessage = async (chatId: string, userId: string, message: string) => {
  try {
    const sanitizedMessage = message.trim().slice(0, 1000); // Limit message length

    // Update chat metadata
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: sanitizedMessage,
        senderId: userId,
        createdAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    });

    // Add message to subcollection
    const messageCollection = collection(db, 'chats', chatId, 'messages');
    await addDoc(messageCollection, {
      text: sanitizedMessage,
      senderId: userId,
      createdAt: serverTimestamp()
    });

    return true;
  } catch (error) {
    console.error('Error sending message:', error);
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
      if (data.lastMessage &&
          data.lastMessage.senderId !== userId &&
          (!data.readBy?.[userId] || data.lastMessage.createdAt > data.readBy[userId])) {
        unreadCount++;
      }
    });

    return unreadCount;
  } catch (error) {
    console.error('Error getting unread messages count:', error);
    return 0;
  }
};

// Re-export necessary functions
export {
  firestoreCollection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  type FirebaseError,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification
};