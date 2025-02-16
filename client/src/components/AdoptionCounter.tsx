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
          collection(db, "adoptionRequests"),
          where("status", "==", "completed")
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
      className="bg-[#DBC63F]/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="bg-[#DBC63F] rounded-full p-3">
          <PawPrint className="w-8 h-8 text-black" />
        </div>
        <div className="text-center">
          <span className="block text-4xl font-bold text-white mb-2">
            {adoptions}
          </span>
          <span className="block text-lg text-white/90">
            Успешни осиновявания
          </span>
        </div>
      </div>
    </motion.div>
  );
}