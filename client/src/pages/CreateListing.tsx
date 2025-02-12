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
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const createListingSchema = z.object({
  title: z.string().min(1, "Заглавието е задължително"),
  type: z.enum(["dog", "cat", "other"]),
  age: z.number().min(0, "Възрастта не може да е отрицателна"),
  description: z.string().min(1, "Описанието е задължително"),
  images: z.array(z.string()).optional(),
});

export default function CreateListing() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]); // Съхранява качените URL адреси
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

  // Функция за качване на снимки (фиктивно)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Генерираме фиктивен URL (примерно изображение)
    const uploadedImages = Array.from(files).map(
      (_, index) => `https://placekitten.com/200/200?image=${index}`
    );

    setImages(uploadedImages);
    form.setValue("images", uploadedImages);
  };

  const onSubmit = async (data: z.infer<typeof createListingSchema>) => {
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
        images, // Добавяме фиктивни снимки
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "listings"), listingData);

      toast({
        title: "Успешно създадена обява",
        description: "Вашата обява беше публикувана успешно",
      });

      setLocation("/listings");
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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Създай нова обява</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                      placeholder="Опишете любимеца"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Поле за качване на снимки */}
            <div>
              <FormLabel>Снимки</FormLabel>
              <input type="file" multiple accept="image/*" onChange={handleFileUpload} />
              <div className="flex gap-2 mt-2">
                {images.map((img, index) => (
                  <img key={index} src={img} alt="uploaded" className="w-20 h-20 object-cover rounded" />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Създаване..." : "Създай обява"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
