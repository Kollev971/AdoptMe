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
import { Edit, MapPin } from "lucide-react";

const tagLabels: Record<string, string> = {
  vaccinated: 'Ваксиниран',
  neutered: 'Кастриран',
  dewormed: 'Обезпаразитен',
  special_needs: 'Специални нужди',
  child_friendly: 'Подходящ за деца',
  trained: 'Обучен'
};

interface ListingCardProps {
  listing: Listing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const { user } = useAuth();
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
        console.error("Грешка при зареждане на потребител:", error);
      }
    };
    fetchListingUser();
  }, [listing]);

  const formatAge = (years: number, months: number) => {
    const yearText = years > 0 ? `${years} ${years === 1 ? 'година' : 'години'}` : '';
    const monthText = months > 0 ? `${months} ${months === 1 ? 'месец' : 'месеца'}` : '';

    if (yearText && monthText) {
      return `${yearText} и ${monthText}`;
    }
    return yearText || monthText || '< 1 месец';
  };

  const getTypeEmoji = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dog': return '🐶';
      case 'cat': return '🐱';
      default: return '🐾';
    }
  };

  return (
    <Card className="overflow-hidden border border-[#004AAD] hover:shadow-lg transition-shadow rounded-xl">
      <CardContent className="p-0">
        <div className="relative">
          <Link href={`/listings/${listing.id}`}>
            <AspectRatio ratio={4 / 3} className="relative bg-gray-100">
              <img
                src={listing.images?.[0] || 'https://via.placeholder.com/400x300?text=Няма+снимка'}
                alt={listing.title}
                className="object-cover w-full h-full transition-transform duration-300 hover:scale-105 rounded-t-xl"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <Badge className="bg-[#01BFFF] text-white py-1 px-3 rounded-full shadow-md">
                  {getTypeEmoji(listing.type)} {listing.type}
                </Badge>
                {listing.status === 'adopted' && (
                  <Badge className="bg-green-500 text-white py-1 px-3 rounded-full shadow-md">
                    Осиновен
                  </Badge>
                )}
              </div>
            </AspectRatio>
          </Link>
          {user?.uid === listing.userId && (
            <Link href={`/listings/${listing.id}/edit`}>
              <Button 
                variant="secondary" 
                size="icon"
                className="absolute top-3 right-3 bg-white/90 hover:bg-white"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>

        <div className="p-4">
          <Link href={`/listings/${listing.id}`} className="no-underline">
            <h3 className="font-semibold text-lg text-[#004AAD] hover:text-[#01BFFF] transition-colors line-clamp-1">
              {listing.title}
            </h3>
          </Link>
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <span className="inline-flex items-center">
              📅 {formatAge(listing.ageYears, listing.ageMonths)}
            </span>
            {listing.location && (
              <span className="inline-flex items-center gap-1">
                • <MapPin className="h-4 w-4" /> {listing.location}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap line-clamp-2">{listing.description}</p>

          {listing.tags && listing.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {listing.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tagLabels[tag]}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 bg-[#F0F7FF] flex flex-col gap-2 rounded-b-xl">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#004AAD] text-white flex items-center justify-center font-bold">
              {listingUser?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="text-sm text-gray-700">
              {listingUser?.username || "Анонимен"}
            </span>
          </div>
          <Link href={`/listings/${listing.id}`}>
            <Button variant="default" size="sm" className="rounded-full bg-[#01BFFF] hover:bg-[#004AAD] text-white px-4">
              Разгледай →
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}