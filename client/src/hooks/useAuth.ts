
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import type { User as AppUser } from '@shared/schema';

type AuthState = {
  user: User | null;
  userData: AppUser | null;
  loading: boolean;
  error: string | null;
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthState({
          user: null,
          userData: null,
          loading: false,
          error: null,
        });
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as AppUser;
          setAuthState({
            user,
            userData: { ...userData, uid: user.uid },
            loading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            error: "User data not found",
          });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setAuthState({
          user: null,
          userData: null,
          loading: false,
          error: "Error loading user data",
        });
      }
    });

    return () => unsubscribe();
  }, []);

  return authState;
}
