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
          where("status", "==", "available")
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
      className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/20"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="bg-[#FFD43B] rounded-full p-4">
          <PawPrint className="w-10 h-10 text-black" />
        </div>
        <div className="text-center">
          <span className="block text-5xl font-bold text-white mb-3">
            {adoptions}
          </span>
          <span className="block text-xl text-white/90">
            Активни обяви
          </span>
        </div>
      </div>
    </motion.div>
  );
}