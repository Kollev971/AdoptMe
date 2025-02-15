
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
      className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full"
    >
      <PawPrint className="w-5 h-5 text-primary" />
      <span className="text-lg font-semibold">
        {adoptions} успешни осиновявания
      </span>
    </motion.div>
  );
}
