import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MapPin, Calendar, User, Phone, Mail } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import Link from 'next/link'; // Added import for Link component

const tagLabels: Record<string, string> = {
  vaccinated: 'Ваксиниран',
  neutered: 'Кастриран',
  dewormed: 'Обезпаразитен',
  special_needs: 'Специални нужди',
  child_friendly: 'Подходящ за деца',
  trained: 'Обучен'
};

export default function ListingDetail() {
  const [, params] = useRoute("/listings/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [ownerDetails, setOwnerDetails] = useState<any>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!params?.id) return;

      try {
        const listingRef = doc(db, "listings", params.id);
        const docSnap = await getDoc(listingRef);

        if (docSnap.exists()) {
          setListing({ id: docSnap.id, ...docSnap.data() } as Listing);

          // Fetch owner details
          const ownerRef = doc(db, "users", docSnap.data().userId);
          const ownerSnap = await getDoc(ownerRef);
          if (ownerSnap.exists()) {
            setOwnerDetails(ownerSnap.data());
          }
        } else {
          toast({
            title: "Грешка",
            description: "Обявата не беше намерена",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Грешка",
          description: "Неуспешно зареждане на обявата",
          variant: "destructive",
        });
      }
    };

    fetchListing();
  }, [params?.id]);

  const handleConnect = async () => {
    if (!user) {
      toast({ description: "Трябва да влезете в профила си", variant: "destructive" });
      setLocation("/auth");
      return;
    }

    if (!listing) return;

    try {
      const [id1, id2] = [listing.userId, user.uid].sort();
      const chatId = `${id1}_${id2}`;

      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          ownerId: listing.userId,
          requesterId: user.uid,
          listingId: listing.id,
          participants: [listing.userId, user.uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setLocation(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      toast({ description: "Грешка при създаване на чат", variant: "destructive" });
    }
  };

  if (!listing) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 bg-[#F0F7FF] min-h-screen">
      <Card className="overflow-hidden border border-[#004AAD] shadow-xl">
        <CardHeader className="bg-[#004AAD] text-white p-6">
          <h1 className="text-4xl font-extrabold text-center">{listing.title}</h1>
          <div className="flex justify-center gap-2 mt-4">
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {listing.type === 'dog' ? '🐶 Куче' : listing.type === 'cat' ? '🐱 Котка' : '🐾 Друго'}
            </Badge>
            {listing.status === 'adopted' && (
              <Badge variant="outline" className="text-lg px-4 py-1 bg-green-500 text-white border-none">
                Осиновен
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          <div className="w-full flex justify-center">
            <Carousel className="w-full max-w-3xl">
              <CarouselContent>
                {listing.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <AspectRatio ratio={16 / 9}>
                      <img
                        src={image}
                        alt={`${listing.title} - изображение ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-contain bg-black/5 rounded-lg"
                      />
                    </AspectRatio>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-[#004AAD]">Информация за любимеца</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#004AAD]" />
                  <span>
                    Възраст:
                    {listing.ageYears > 0 && ` ${listing.ageYears} ${listing.ageYears === 1 ? 'година' : 'години'}`}
                    {listing.ageYears > 0 && listing.ageMonths > 0 && ' и '}
                    {listing.ageMonths > 0 && ` ${listing.ageMonths} ${listing.ageMonths === 1 ? 'месец' : 'месеца'}`}
                    {listing.ageYears === 0 && listing.ageMonths === 0 && ' < 1 месец'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#004AAD]" />
                  <span>Локация: {listing.location}</span>
                </div>
                {listing.tags && listing.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {listing.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="px-3 py-1">
                        {tagLabels[tag]}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {ownerDetails && (
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-[#004AAD]">Информация за стопанина</h2>
                <div>
                  <Link href={`/user/${listing.userId}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-[#004AAD] text-white flex items-center justify-center text-2xl font-bold">
                            {ownerDetails.username?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg font-semibold">{ownerDetails.fullName}</h3>
                            <p className="text-gray-600">@{ownerDetails.username}</p>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <User className="h-4 w-4" />
                              <span>Вижте профила</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                  {user && user.uid !== listing.userId && (
                    <div className="flex justify-center mt-4">
                      <Button 
                        onClick={handleConnect}
                        className="bg-[#01BFFF] hover:bg-[#004AAD] text-white"
                      >
                        Свържи се със стопанина
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-2xl font-semibold text-[#004AAD] mb-4">Описание</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{listing.description}</p>
          </div>

          {user && user.uid !== listing.userId && listing.status !== 'adopted' && (
            <div className="flex justify-center pt-6">
              <Button
                onClick={handleConnect}
                className="bg-[#01BFFF] hover:bg-[#004AAD] text-white px-8 py-6 text-lg rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105"
              >
                Свържи се със стопанина
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}