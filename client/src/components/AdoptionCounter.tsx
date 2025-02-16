import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";

export default function AdoptionCounter() {
  const [adoptions, setAdoptions] = useState(0);

  useEffect(() => {
    const fetchAdoptions = async () => {
      try {
        const adoptionsQuery = query(
          collection(db, "listings"),
          where("status", "==", "adopted")
        );
        const adoptionsSnap = await getDocs(adoptionsQuery);
        setAdoptions(adoptionsSnap.size);
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
      className="bg-white/20 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/30 transform hover:scale-105 transition-all duration-300"
    >
      <div className="flex flex-col items-center gap-4">
        <svg 
          width="80" 
          height="80" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="white" 
          strokeWidth="0.5" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="w-20 h-20"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          <text 
            x="50%" 
            y="50%" 
            textAnchor="middle" 
            fill="white" 
            fontSize="5" 
            fontWeight="200" 
            dy=".3em"
            style={{ fontFamily: 'Arial' }}
          >
            {adoptions}
          </text>
        </svg>
        <span className="text-white text-sm mt-2">Осиновени животни</span>
      </div>
    </motion.div>
  );
}