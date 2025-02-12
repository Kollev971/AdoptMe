import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { generateChatId } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
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
  const [loading, setLoading] = useState(false);

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

  if (!listing) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6 bg-gray-50 rounded-lg shadow-md min-h-screen flex flex-col items-center justify-center">
      <Card className="w-full max-w-3xl overflow-hidden rounded-lg shadow-lg bg-white">
        <CardHeader className="bg-gray-900 text-white p-6 text-center rounded-t-lg">
          <h1 className="text-3xl font-bold">{listing.title}</h1>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="w-full flex justify-center">
            <Carousel className="w-full max-w-2xl">
              <CarouselContent>
                {listing.images.map((image, index) => (
                  <CarouselItem key={index} className="flex justify-center">
                    <div className="aspect-square relative max-w-lg">
                      <img
                        src={image}
                        alt={`${listing.title} - изображение ${index + 1}`}
                        className="object-cover w-full h-full rounded-lg shadow-md"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-700 text-lg">
            <div><span className="font-semibold">Вид:</span> {listing.type}</div>
            <div><span className="font-semibold">Възраст:</span> {listing.age} години</div>
            <div><span className="font-semibold">Публикувано на:</span> {new Date(listing.createdAt).toLocaleDateString()}</div>
          </div>

          <div className="border-t border-gray-300 pt-4">
            <h2 className="font-semibold text-xl">Описание</h2>
            <p className="text-gray-600 leading-relaxed">{listing.description}</p>
          </div>

          {user && user.uid !== listing.userId && (
            <Button
              onClick={() => setLocation(`/chat/${generateChatId(listing.userId, user.uid)}`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg shadow-md"
            >
              Свържи се с потребителя
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}