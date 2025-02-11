import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User as AppUser } from '@shared/schema';

type AuthState = {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setAuthState({
              user,
              userData: userDoc.data() as AppUser,
              loading: false,
            });
          } else {
            console.error("User document not found in Firestore");
            setAuthState({ user, userData: null, loading: false });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setAuthState({ user, userData: null, loading: false });
        }
      } else {
        setAuthState({ user: null, userData: null, loading: false });
      }
    });

    return unsubscribe;
  }, []);

  return authState;
}