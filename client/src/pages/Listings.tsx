import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy, getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Listing } from "@shared/schema";
import { ListingCard } from "@/components/ListingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const listingsData = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data() as Listing;

            // Проверяваме дали userId съществува
            if (!data.userId) {
              return { id: docSnap.id, ...data, username: "Неизвестен потребител" };
            }

            try {
              // Вземаме username от `users/{userId}`
              const userRef = doc(db, "users", data.userId);
              const userSnap = await getDoc(userRef);

              if (userSnap.exists()) {
                return { id: docSnap.id, ...data, username: userSnap.data().username };
              }
            } catch (error) {
              console.error("Error fetching username:", error);
            }

            return { id: docSnap.id, ...data, username: "Неизвестен потребител" };
          })
        );

        setListings(listingsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching listings:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredListings = listings.filter((listing) =>
    filter === "all" ? true : listing.type === filter
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Филтър и заглавие */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">🏡 Намери своя бъдещ любимец</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px] bg-white border border-gray-300 shadow-md rounded-lg">
            <SelectValue placeholder="Филтрирай по вид" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всички</SelectItem>
            <SelectItem value="dog">🐶 Кучета</SelectItem>
            <SelectItem value="cat">🐱 Котки</SelectItem>
            <SelectItem value="other">🐾 Други</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Обяви */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[300px] bg-gray-200 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {filteredListings.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-lg text-gray-500">Няма намерени обяви 🙁</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
