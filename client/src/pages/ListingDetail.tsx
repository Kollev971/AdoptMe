import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { doc, getDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Listing } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export default function ListingDetail() {
  const [, params] = useRoute("/listings/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchListing = async () => {
      if (!params?.id) return;

      try {
        const docRef = doc(db, "listings", params.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setListing({ id: docSnap.id, ...docSnap.data() } as Listing);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load listing",
          variant: "destructive",
        });
      }
    };

    fetchListing();
  }, [params?.id]);

  const handleAdoptionRequest = async () => {
    if (!user || !listing) return;

    try {
      setLoading(true);
      
      await addDoc(collection(db, "adoptionRequests"), {
        listingId: listing.id,
        userId: user.uid,
        message,
        status: "pending",
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "Success",
        description: "Adoption request sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!listing) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="mb-6">
            <Carousel>
              <CarouselContent>
                {listing.images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-square relative">
                      <img
                        src={image}
                        alt={`${listing.title} - image ${index + 1}`}
                        className="object-cover rounded-lg"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>

          <h1 className="text-3xl font-bold mb-4">{listing.title}</h1>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <span className="font-medium">Type:</span> {listing.type}
            </div>
            <div>
              <span className="font-medium">Age:</span> {listing.age} years
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-medium mb-2">Description</h2>
            <p className="text-gray-600">{listing.description}</p>
          </div>

          {user && user.uid !== listing.userId && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">Request Adoption</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Send Adoption Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Write a message to the owner..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <Button 
                    onClick={handleAdoptionRequest}
                    disabled={loading || !message.trim()}
                    className="w-full"
                  >
                    {loading ? "Sending..." : "Send Request"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
