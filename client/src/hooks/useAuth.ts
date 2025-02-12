import { useState, useEffect } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import type { User } from "@shared/schema";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }

      const userRef = ref(database, `users/${firebaseUser.uid}`);
      const unsubscribeSnapshot = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setUserData(snapshot.val() as User);
        } else {
          setUserData(null);
        }
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  return { user, userData, loading };
}