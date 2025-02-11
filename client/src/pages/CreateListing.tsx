import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { listingSchema } from "@shared/schema";

const createListingSchema = listingSchema.omit({ id: true, userId: true, createdAt: true });

export default function CreateListing() {
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof createListingSchema>>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      type: "dog",
      age: 0,
      description: "",
      images: [],
    },
  });

  const onSubmit = async (data: z.infer<typeof createListingSchema>) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a listing",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Upload images
      const imageUrls: string[] = [];
      if (selectedFiles) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const storageRef = ref(storage, `listings/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const url = await getDownloadURL(snapshot.ref);
          imageUrls.push(url);
        }
      }

      // Create listing
      const listingData = {
        ...data,
        images: imageUrls,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "listings"), listingData);

      toast({
        title: "Success",
        description: "Listing created successfully",
      });
      
      setLocation("/listings");
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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Listing</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter listing title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pet type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="dog">Dog</SelectItem>
                      <SelectItem value="cat">Cat</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age (years)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0"
                      step="0.1"
                      placeholder="Enter pet age" 
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the pet" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Images</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Listing"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
