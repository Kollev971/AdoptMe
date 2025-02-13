import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, push, set } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBi0vY3afPi46kgqgBJvW6JHxLUwqQsSYI",
  authDomain: "doggycat-5b20c.firebaseapp.com",
  databaseURL: "https://doggycat-5b20c-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "doggycat-5b20c",
  storageBucket: "doggycat-5b20c.firebasestorage.app",
  messagingSenderId: "147390397323",
  appId: "1:147390397323:web:581d860b5a6a683acb8d8e",
  measurementId: "G-PS3DS1YQQY"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const storage = getStorage(app);
export const database = getDatabase(app); // Realtime Database - само за чат
export const db = getFirestore(app); // Firestore - за всичко останало

// Initialize Realtime Database with persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser doesn\'t support persistence.');
    }
});
export const analytics = getAnalytics(app);

export const registerUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
    }
    return userCredential.user;
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

export const sendMessage = async (chatId: string, userId: string, message: string) => {
  try {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      userId,
      message,
      timestamp: Date.now()
    });

    const chatRef = ref(database, `chats/${chatId}`);
    await set(chatRef, {
      lastMessage: {
        text: message,
        senderId: userId,
        timestamp: Date.now()
      }
    }, { merge: true });

    return true;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

const getFirebaseErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
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
    default:
      return 'Възникна грешка. Моля, опитайте отново';
  }
};