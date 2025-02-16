import { Link, useLocation } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc 
} from "firebase/firestore";
import { Edit, MapPin, Share2, Trash2, PawPrint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";

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
  const [, setLocation] = useLocation();

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

  const handleStatusChange = async () => {
    try {
      const newStatus = listing.status === 'adopted' ? 'available' : 'adopted';
      const listingRef = doc(db, "listings", listing.id);
      await updateDoc(listingRef, { status: newStatus });

      const adoptionRef = collection(db, "adoptionRequests");
      if (newStatus === 'adopted') {
        await addDoc(adoptionRef, {
          listingId: listing.id,
          userId: user.uid,
          ownerId: listing.userId,
          status: "completed",
          message: "Автоматично осиновяване от собственика",
          createdAt: new Date().toISOString()
        });
      } else {
        const adoptionsQuery = query(
          adoptionRef,
          where("listingId", "==", listing.id),
          where("status", "==", "completed")
        );
        const adoptionsSnap = await getDocs(adoptionsQuery);
        const deletePromises = adoptionsSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }
      toast({
        description: newStatus === 'adopted' 
          ? "Обявата е маркирана като осиновена" 
          : "Обявата е маркирана като налична"
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        variant: "destructive",
        description: "Възникна грешка при промяна на статуса"
      });
    }
  };

  const handleConnect = () => {
    if (!user) {
      toast({ 
        title: "Необходима е регистрация",
        description: "Трябва да влезете в профила си, за да се свържете със стопанина",
        variant: "destructive"
      });
      setLocation("/auth");
      return;
    }
    setLocation(`/listings/${listing.id}`);
  };

  return (
    <Card className="overflow-hidden border border-[#DBC63F] hover:shadow-lg transition-shadow rounded-xl">
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
                <Badge className="bg-[#DBC63F] text-white py-1 px-3 rounded-full shadow-md">
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
                  className="bg-white/90 hover:bg-white text-[#004AAD]"
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="icon"
                onClick={handleStatusChange}
                className={`${
                  listing.status === 'adopted'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-white/90 hover:bg-green-500 hover:text-white text-[#004AAD]'
                }`}
              >
                <PawPrint className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={onDelete}
                className="bg-white/90 hover:bg-red-500 hover:text-white text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="p-4">
          <Link href={`/listings/${listing.id}`} className="no-underline">
            <h3 className="font-semibold text-lg text-[#DBC63F] hover:text-[#D89EAA] transition-colors line-clamp-1">
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
            <div className="w-8 h-8 rounded-full bg-[#DBC63F] text-white flex items-center justify-center font-bold">
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
            {listing.status !== 'adopted' && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleConnect}
                className="rounded-full bg-[#DBC63F] hover:bg-[#D89EAA] text-white px-4"
              >
                Свържи се
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}