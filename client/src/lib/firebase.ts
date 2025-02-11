import { initializeApp } from "firebase/app";
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

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const registerUser = async (email: string, password: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await sendEmailVerification(userCredential.user);
  return userCredential.user;
};

export const loginUser = async (email: string, password: string) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};
