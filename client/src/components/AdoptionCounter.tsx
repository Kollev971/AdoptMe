import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";

export default function AdoptionCounter() {
  const [adoptions, setAdoptions] = useState(0);

  useEffect(() => {
    const fetchAdoptions = async () => {
      try {
        const listingsQuery = query(
          collection(db, "listings"),
          where("status", "==", "adopted")
        );
        const listingsSnap = await getDocs(listingsQuery);

        const adoptionsQuery = query(
          collection(db, "adoptionRequests"),
          where("status", "==", "completed")
        );
        const adoptionsSnap = await getDocs(adoptionsQuery);

        setAdoptions(Math.max(listingsSnap.size, adoptionsSnap.size));
      } catch (error) {
        console.error("Error fetching adoptions:", error);
      }
    };

    fetchAdoptions();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="p-8"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg 
            width="60" 
            height="60" 
            viewBox="0 0 24 24" 
            fill="none"
            className="w-16 h-16"
          >
            <path 
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
              stroke="white"
              strokeWidth="0.5"
            />
          </svg>
          <span 
            className="absolute text-white text-lg font-bold"
            style={{ fontFamily: 'Noah' }}
          >
            {adoptions}
          </span>
        </div>
        <span className="text-white text-sm">Осиновени животни</span>
      </div>
    </motion.div>
  );
}
