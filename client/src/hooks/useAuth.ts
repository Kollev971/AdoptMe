
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
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
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (unsubscribeDoc) unsubscribeDoc();
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
        unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data() as AppUser;
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
              error: "Потребителската информация не беше намерена",
            });
          }
        });
      } catch (error) {
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
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  return authState;
}
