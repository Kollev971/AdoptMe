
import { Link } from "wouter";
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
        const userRef = doc(db, "users", listing.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setListingUser(userSnap.data());
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

  const getTypeEmoji = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dog': return '🐶';
      case 'cat': return '🐱';
      default: return '🐾';
    }
  };

  return (
    <Link href={`/listings/${listing.id}`}>
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer bg-white">
        <CardContent className="p-0">
          <AspectRatio ratio={4 / 3} className="relative bg-gray-100">
            <img
              src={listing.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image'}
              alt={listing.title}
              className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
            />
            <Badge className="absolute top-3 left-3 bg-white/90 text-primary py-1 px-3 rounded-full shadow-lg backdrop-blur-sm">
              {getTypeEmoji(listing.type)} {listing.type}
            </Badge>
          </AspectRatio>

          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 hover:text-primary transition-colors line-clamp-1">
              {listing.title}
            </h3>
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
              <span className="inline-flex items-center">
                📅 {formatAge(listing.age)}
              </span>
              {listing.location && (
                <span className="inline-flex items-center">
                  • 📍 {listing.location}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-700 line-clamp-2">{listing.description}</p>
          </div>
        </CardContent>

        <CardFooter className="p-4 bg-gray-50 flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {listingUser?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <span className="text-sm text-gray-600">
                {listingUser?.username || "Анонимен"}
              </span>
            </div>
            <Button variant="default" size="sm" className="rounded-full">
              Разгледай →
            </Button>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
