import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useLocation, useNavigate } from 'react-router-dom';

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const setLocation = (path: string) => navigate(path, {replace: true});


  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;

      try {
        const docRef = doc(db, "listings", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setListing({ id: docSnap.id, ...docSnap.data() } as Listing);
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

  const openChat = async () => {
    if (!user || !listing) return;

    try {
      setLoading(true);
      const chatId = [listing.userId, user.uid].sort().join('_');
      const chatRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: {
            [listing.userId]: true,
            [user.uid]: true
          },
          listingId: listing.id,
          createdAt: new Date().toISOString(),
        });
      }

      setLocation(`/chat/${chatId}`);
    } catch (error: any) {
      toast({
        title: "Грешка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
            <Button onClick={openChat} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg shadow-md">
              Отвори чат
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}