import { useEffect, useState } from "react";
import { collection, query, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Listing } from "@shared/schema";
import { ListingCard } from "@/components/ListingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const q = query(collection(db, "listings"));
        const querySnapshot = await getDocs(q);
        const listingsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Listing[];
        setListings(listingsData);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchListings();
  }, []);

  const filteredListings = listings.filter(listing => 
    filter === "all" ? true : listing.type === filter
  );

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-[300px] bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pets</SelectItem>
            <SelectItem value="dog">Dogs</SelectItem>
            <SelectItem value="cat">Cats</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No listings found</p>
        </div>
      )}
    </div>
  );
}
