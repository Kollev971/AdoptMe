import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function ListingDetail() {
  const [, params] = useRoute("/listings/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);

  useEffect(() => {
    const fetchListing = async () => {
      if (!params?.id) return;

      try {
        const listingRef = doc(db, "listings", params.id);
        const docSnap = await getDoc(listingRef);

        if (docSnap.exists()) {
          setListing({ id: docSnap.id, ...docSnap.data() } as Listing);
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
    <div className="max-w-5xl mx-auto space-y-8 p-6 bg-[#F0F7FF] rounded-lg shadow-md min-h-screen flex flex-col items-center">
      <Card className="w-full max-w-3xl overflow-hidden rounded-2xl shadow-xl bg-white">
        <CardHeader className="bg-[#004AAD] text-white p-6 text-center rounded-t-2xl">
          <h1 className="text-4xl font-extrabold">{listing.title}</h1>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="w-full flex justify-center">
            <Carousel className="w-full max-w-2xl">
              <CarouselContent>
                {listing.images.map((image, index) => (
                  <CarouselItem key={index} className="flex justify-center">
                    <div className="aspect-square relative max-w-lg">
                      <img src={image} alt={`${listing.title} - изображение ${index + 1}`} className="object-cover w-full h-full rounded-lg shadow-md" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 text-lg">
            <div><span className="font-semibold text-[#004AAD]">Вид:</span> {listing.type}</div>
            <div><span className="font-semibold text-[#004AAD]">Възраст:</span> {listing.age} години</div>
            <div><span className="font-semibold text-[#004AAD]">Публикувано на:</span> {new Date(listing.createdAt).toLocaleDateString()}</div>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h2 className="font-semibold text-2xl text-[#004AAD]">Описание</h2>
            <p className="text-gray-600 leading-relaxed">{listing.description}</p>
          </div>

          {user && user.uid !== listing.userId && (
            <Button onClick={handleConnect} className="w-full bg-[#01BFFF] hover:bg-[#009EDF] text-white py-3 rounded-lg shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
              Свържи се с потребителя
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
