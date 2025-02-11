
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
      try {
        if (user) {
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
            console.error("User document not found in Firestore");
            setAuthState({
              user: null,
              userData: null,
              loading: false,
              error: "Потребителската информация не беше намерена",
            });
          }
        } else {
          setAuthState({
            user: null,
            userData: null,
            loading: false,
            error: null,
          });
        }
      } catch (error: any) {
        console.error("Error fetching user data:", error);
        setAuthState({
          user: null,
          userData: null,
          loading: false,
          error: "Грешка при зареждане на потребителската информация",
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return authState;
}
