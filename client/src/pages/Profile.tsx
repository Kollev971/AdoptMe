import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import type { User, Listing, AdoptionRequest } from "@shared/schema";
import { ListingCard } from "@/components/ListingCard";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [adoptionRequests, setAdoptionRequests] = useState<AdoptionRequest[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as User);
        }

        // Fetch user's listings
        const listingsQuery = query(
          collection(db, "listings"),
          where("userId", "==", user.uid)
        );
        const listingsSnapshot = await getDocs(listingsQuery);
        const listingsData = listingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Listing[];
        setListings(listingsData);

        // Fetch user's adoption requests
        const requestsQuery = query(
          collection(db, "adoptionRequests"),
          where("userId", "==", user.uid)
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdoptionRequest[];
        setAdoptionRequests(requestsData);

      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      }
    };

    fetchProfile();
  }, [user]);

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">Username:</span> {profile.username}
          </div>
          <div>
            <span className="font-medium">Full Name:</span> {profile.fullName}
          </div>
          <div>
            <span className="font-medium">Email:</span> {profile.email}
          </div>
          <div>
            <span className="font-medium">Phone:</span> {profile.phone}
          </div>
          <div>
            <span className="font-medium">Member since:</span>{" "}
            {new Date(profile.createdAt).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="listings">
        <TabsList>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="requests">Adoption Requests</TabsTrigger>
        </TabsList>
        
        <TabsContent value="listings">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-4">
            {adoptionRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Request for listing: {request.listingId}</p>
                      <p className="text-sm text-gray-500">Status: {request.status}</p>
                      <p className="text-sm mt-2">{request.message}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
