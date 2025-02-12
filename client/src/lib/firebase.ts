import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBi0vY3afPi46kgqgBJvW6JHxLUwqQsSYI",
  authDomain: "doggycat-5b20c.firebaseapp.com",
  projectId: "doggycat-5b20c",
  storageBucket: "doggycat-5b20c.firebasestorage.app",
  messagingSenderId: "147390397323",
  appId: "1:147390397323:web:581d860b5a6a683acb8d8e",
  measurementId: "G-PS3DS1YQQY"
};

// Initialize Firebase only if no apps exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

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