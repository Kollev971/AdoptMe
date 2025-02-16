import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { motion } from "framer-motion";
import { PawPrint } from "lucide-react";

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
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full p-4 shadow-lg">
          <PawPrint className="w-10 h-10 text-white" />
        </div>
        <div className="text-center">
          <span className="block text-6xl font-bold text-white mb-3 text-shadow">
            {adoptions}
          </span>
          <span className="block text-xl font-medium text-white/95">
            Осиновени животни
          </span>
        </div>
      </div>
    </motion.div>
  );
}