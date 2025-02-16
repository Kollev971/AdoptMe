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

        // Use the higher number between listings and adoptionRequests
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
      <div className="flex flex-col items-center mt-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-36 w-36 bg-[#D89EAA] rounded-full flex items-center justify-center shadow-xl">
              <div className="text-5xl font-bold text-white">{adoptions}</div>
            </div>
          </div>
          <p className="text-xl text-white font-medium">осиновени животни</p>
        </div>
      </div>
    </motion.div>
  );
}