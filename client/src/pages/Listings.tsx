import { useEffect, useState } from "react";
import { ref, query, orderByChild, onValue, get } from "firebase/database";
import { database } from "@/lib/firebase";
import type { Listing } from "@shared/schema";
import { ListingCard } from "@/components/ListingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const listingsRef = ref(database, "listings");
    const listingsQuery = query(listingsRef, orderByChild("createdAt"));

    const unsubscribe = onValue(listingsQuery, async (snapshot) => {
      const listingsData: Listing[] = [];
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        listingsData.push({
          id: childSnapshot.key!,
          ...data,
        });
      });

      // Sort by createdAt in descending order
      listingsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setListings(listingsData);
      setLoading(false);
    });

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