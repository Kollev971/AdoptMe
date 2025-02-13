
import { useState, useEffect } from "react";
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
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const createListingSchema = z.object({
  title: z.string().min(1, "Заглавието е задължително"),
  type: z.enum(["dog", "cat", "other"]),
  age: z.number().min(0, "Възрастта не може да е отрицателна"),
  description: z.string().min(20, "Описанието трябва да е поне 20 символа"),
  images: z.array(z.string()).min(1, "Необходима е поне една снимка"),
});

type FormValues = z.infer<typeof createListingSchema>;

export default function CreateListing() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      type: "dog",
      age: 0,
      description: "",
      images: [],
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        title: "Грешка",
        description: "Трябва да сте влезли в профила си, за да създадете обява",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const listingData = {
        ...data,
        images,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      // Create a new listing in Firestore
      const listingsRef = collection(db, 'listings');
      await addDoc(listingsRef, listingData);

      toast({
        title: "Успешно създадена обява",
        description: "Вашата обява беше публикувана успешно",
      });

      setLocation("/listings");
    } catch (error: any) {
      console.error("Error creating listing:", error);
      toast({
        title: "Грешка",
        description: error.message || "Възникна проблем при създаването на обявата",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setValue("images", images);
  }, [images, form]);

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Създай нова обява</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Заглавие</FormLabel>
                    <FormControl>
                      <Input placeholder="Въведете заглавие на обявата" {...field} />
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
                    <FormLabel>Вид на любимеца</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Изберете вид" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dog">Куче</SelectItem>
                        <SelectItem value="cat">Котка</SelectItem>
                        <SelectItem value="other">Друго</SelectItem>
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
                    <FormLabel>Възраст (години)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="Въведете възрастта"
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
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишете любимеца подробно..."
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="images"
                render={() => (
                  <FormItem>
                    <FormLabel>Снимки</FormLabel>
                    <FormControl>
                      <FileUpload
                        images={images}
                        setImages={setImages}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Създаване...
                  </>
                ) : (
                  "Създай обява"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
