import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Listing } from "@shared/schema";
import { ListingCard } from "@/components/ListingCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function Listings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [animalType, setAnimalType] = useState<string>("all");
  const [ageRange, setAgeRange] = useState<string>("all");
  const [location, setLocation] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    const listingsRef = collection(db, "listings");
    const q = query(listingsRef, orderBy("createdAt", "desc"));

    const unsubscribeListings = onSnapshot(q, (snapshot) => {
      const listingsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Listing[];

      // Filter out adopted listings
      const filteredListings = listingsData.filter((listing) => listing.status !== 'adopted'); 
      setListings(filteredListings);
      setLoading(false);
    }, (error) => {
      // Remove the toast call here
      // toast({ 
      //   title: "Грешка", 
      //   description: "Проблем при зареждането на обявите", 
      //   variant: "destructive" 
      // });
      setLoading(false);
    });

    return () => {
      unsubscribeListings();
    };
  }, []);

  const filteredListings = listings.filter((listing) => {
    const matchesType = animalType === "all" ? true : listing.type === animalType;
    const matchesLocation = !location ? true : listing.location?.toLowerCase().includes(location.toLowerCase());

    let matchesAge = true;
    if (ageRange !== "all") {
      const totalMonths = (listing.ageYears * 12) + listing.ageMonths;
      switch (ageRange) {
        case "baby": // 0-6 месеца
          matchesAge = totalMonths <= 6;
          break;
        case "young": // 6 месеца - 2 години
          matchesAge = totalMonths > 6 && totalMonths <= 24;
          break;
        case "adult": // 2-8 години
          matchesAge = totalMonths > 24 && totalMonths <= 96;
          break;
        case "senior": // над 8 години
          matchesAge = totalMonths > 96;
          break;
      }
    }

    return matchesType && matchesLocation && matchesAge;
  });

  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Филтър и заглавие */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">🏡 Намери своя бъдещ любимец</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={animalType} onValueChange={setAnimalType}>
            <SelectTrigger className="w-full bg-white border border-gray-300 shadow-md rounded-lg">
              <SelectValue placeholder="Вид животно" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички</SelectItem>
              <SelectItem value="dog">🐶 Кучета</SelectItem>
              <SelectItem value="cat">🐱 Котки</SelectItem>
              <SelectItem value="other">🐾 Други</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ageRange} onValueChange={setAgeRange}>
            <SelectTrigger className="w-full bg-white border border-gray-300 shadow-md rounded-lg">
              <SelectValue placeholder="Възраст" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Всички възрасти</SelectItem>
              <SelectItem value="baby">Бебета (0-6 месеца)</SelectItem>
              <SelectItem value="young">Млади (6м-2г)</SelectItem>
              <SelectItem value="adult">Възрастни (2-8г)</SelectItem>
              <SelectItem value="senior">Старши (8+г)</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <input
              type="text"
              placeholder="Търсене по локация..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-gray-300 shadow-md rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
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
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <nav className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50"
                    >
                      Предишна
                    </button>
                    <span className="px-4 py-1">
                      Страница {currentPage} от {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-md bg-gray-100 disabled:opacity-50"
                    >
                      Следваща
                    </button>
                  </nav>
                </div>
              )}
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