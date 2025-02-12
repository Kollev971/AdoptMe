import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { userData } = useAuth();
  const [listingUser, setListingUser] = useState<any>(null);

  useEffect(() => {
    const fetchListingUser = async () => {
      if (!listing?.userId) return;

      try {
        const docRef = doc(db, "users", listing.userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setListingUser(docSnap.data());
        }
      } catch (error: any) {
        console.error("Error fetching listing user:", error);
      }
    };

    fetchListingUser();
  }, [listing]);

  const formatAge = (age: number) => {
    if (age < 1) {
      const months = Math.round(age * 12);
      return `${months} месеца`;
    }
    return `${age} години`;
  };

  return (
    <Link href={`/listings/${listing.id}`} className="block">
      <Card className="overflow-hidden hover:shadow-xl transition-transform transform hover:scale-105 cursor-pointer rounded-xl bg-white shadow-md">
        <CardContent className="p-0">
          <AspectRatio ratio={4 / 3} className="relative">
            <img
              src={listing.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
              alt={listing.title}
              className="object-cover w-full h-full rounded-t-xl transition-transform transform hover:scale-110"
            />
            <Badge className="absolute top-3 left-3 bg-primary text-white py-1 px-3 rounded-lg shadow-md capitalize">
              {listing.type}
            </Badge>
          </AspectRatio>

          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 truncate hover:text-primary transition-colors">
              {listing.title}
            </h3>
            <p className="text-sm text-gray-600">Възраст: {formatAge(listing.age)}</p>
            <p className="text-sm text-gray-700 line-clamp-2">{listing.description}</p>
          </div>
        </CardContent>

        <CardFooter className="p-4 flex flex-col bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            Публикувано от: <span className="font-medium">{listingUser?.username || "Анонимен"}</span>
          </div>
          <div className="text-sm text-gray-500">Дата: {new Date(listing.createdAt).toLocaleDateString()}</div>
          <Button variant="default" size="sm" className="mt-3 w-full">
            Свържи се
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}