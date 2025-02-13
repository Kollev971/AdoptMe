import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, query, orderByChild, onValue, push, set, off } from "firebase/database";
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

// Initialize Firebase only if no apps exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const storage = getStorage(app);
export const database = getDatabase(app); // Realtime Database for chat
export const firestore = getFirestore(app); // Firestore for everything else
export const analytics = getAnalytics(app);

// Helper function for registration
export const registerUser = async (email: string, password: string) => {
  try {
    console.log("Starting registration process for:", email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log("User created successfully:", userCredential.user.uid);

    if (userCredential.user) {
      await sendEmailVerification(userCredential.user);
      console.log("Verification email sent");
    }
    return userCredential.user;
  } catch (error: any) {
    console.error("Registration error:", error);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Helper function for login
export const loginUser = async (email: string, password: string) => {
  try {
    console.log("Starting login process for:", email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("Login successful for user:", userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(getFirebaseErrorMessage(error.code));
  }
};

// Chat related functions using Realtime Database
export const sendMessage = async (chatId: string, userId: string, message: string) => {
  try {
    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      userId,
      message,
      timestamp: Date.now()
    });

    // Update last message
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

export const subscribeToChat = (chatId: string, callback: (messages: any[]) => void) => {
  const messagesRef = ref(database, `chats/${chatId}/messages`);
  const messagesQuery = query(messagesRef, orderByChild('timestamp'));

  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    const messages: any[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    callback(messages);
  });

  return () => {
    off(messagesRef);
    unsubscribe();
  };
};

// Function to get user-friendly error messages
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