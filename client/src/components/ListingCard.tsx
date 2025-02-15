import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, addDoc } from "firebase/firestore";
import { Edit, MapPin, Share2, Trash2, PawPrint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  showActions?: boolean;
  onDelete?: () => void;
}

export function ListingCard({ listing, showActions, onDelete }: ListingCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
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

  const handleShare = async () => {
    try {
      const shareData = {
        title: listing.title,
        text: `Разгледайте тази обява за осиновяване: ${listing.title}`,
        url: window.location.origin + `/listings/${listing.id}`
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast({ description: "Линкът е копиран в клипборда" });
      }
    } catch (error) {
      console.error("Error sharing:", error);
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
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105 rounded-t-xl"
                loading="lazy"
              />
              <div className="absolute top-3 left-3 flex gap-2 z-10">
                <Badge className="bg-[#01BFFF] text-white py-1 px-3 rounded-full shadow-md">
                  {getTypeEmoji(listing.type)} {listing.type === 'dog' ? 'Куче' : listing.type === 'cat' ? 'Котка' : 'Друго'}
                </Badge>
                {listing.status === 'adopted' && (
                  <Badge className="bg-green-500 text-white py-1 px-3 rounded-full shadow-md">
                    Осиновен
                  </Badge>
                )}
              </div>
            </AspectRatio>
          </Link>
          {showActions && user?.uid === listing.userId && (
            <div className="absolute top-3 right-3 flex gap-2 z-10">
              <Link href={`/listings/${listing.id}/edit`}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white/90 hover:bg-white"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="icon"
                onClick={async () => {
                  try {
                    const newStatus = listing.status === 'adopted' ? 'available' : 'adopted';
                    const listingRef = doc(db, "listings", listing.id);
                    await updateDoc(listingRef, { status: newStatus });

                    if (newStatus === 'adopted') {
                      const adoptionRef = collection(db, "adoptionRequests");
                      await addDoc(adoptionRef, {
                        listingId: listing.id,
                        userId: user.uid,
                        status: 'completed',
                        createdAt: new Date().toISOString()
                      });
                    }
                  } catch (error) {
                    console.error("Error updating status:", error);
                  }
                }}
                className={`${
                  listing.status === 'adopted'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-white/90 hover:bg-green-500'
                } text-white`}
              >
                <PawPrint className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={onDelete}
                className="bg-white/90 hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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
            <Link href={`/user/${listing.userId}`} className="text-sm text-gray-700 hover:text-[#01BFFF] transition-colors">
              {listingUser?.username || "Анонимен"}
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="hover:bg-[#01BFFF]/10"
            >
              <Share2 className="h-4 w-4 text-[#004AAD]" />
            </Button>
            <Link href={`/listings/${listing.id}`}>
              <Button variant="default" size="sm" className="rounded-full bg-[#01BFFF] hover:bg-[#004AAD] text-white px-4">
                Разгледай →
              </Button>
            </Link>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}