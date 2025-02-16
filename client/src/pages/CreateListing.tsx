import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/FileUpload";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

const createListingSchema = z.object({
  title: z.string().min(1, "Заглавието е задължително").max(50, "Заглавието трябва да е максимум 50 символа"),
  type: z.enum(["dog", "cat", "other"]),
  ageYears: z.number().min(0, "Годините не може да са отрицателни").max(30, "Максималната възраст е 30 години"),
  ageMonths: z.number().min(0, "Месеците не може да са отрицателни").max(11, "Месеците трябва да са между 0 и 11"),
  description: z.string()
    .min(20, "Описанието трябва да е поне 20 символа")
    .max(300, "Описанието трябва да е максимум 300 символа"),
  images: z.array(z.string()).min(1, "Необходима е поне една снимка"),
  location: z.string().min(3, "Моля, въведете локация"),
  status: z.enum(["available", "adopted"]).default("available"),
  tags: z.array(z.string()).default([])
});

const availableTags = [
  { id: 'vaccinated', label: 'Ваксиниран' },
  { id: 'neutered', label: 'Кастриран' },
  { id: 'dewormed', label: 'Обезпаразитен' },
  { id: 'special_needs', label: 'Специални нужди' },
  { id: 'child_friendly', label: 'Подходящ за деца' },
  { id: 'trained', label: 'Обучен' }
];

type FormValues = z.infer<typeof createListingSchema>;

export default function CreateListing() {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, params] = useRoute("/listings/:id/edit");
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      type: "dog",
      ageYears: 0,
      ageMonths: 0,
      description: "",
      images: [],
      location: "",
      status: "available",
      tags: []
    },
  });

  useEffect(() => {
    const fetchListing = async () => {
      if (!params?.id) return;
      try {
        const listingRef = doc(db, "listings", params.id);
        const docSnap = await getDoc(listingRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          form.reset({
            title: data.title,
            type: data.type,
            ageYears: data.ageYears || 0,
            ageMonths: data.ageMonths || 0,
            description: data.description,
            images: data.images,
            location: data.location || "",
            status: data.status || "available",
            tags: data.tags || []
          });
          setImages(data.images);
          setSelectedTags(data.tags || []);
          setIsEditing(true);
        }
      } catch (error: any) {
        toast({
          title: "Грешка",
          description: "Неуспешно зареждане на обявата",
          variant: "destructive",
        });
      }
    };

    if (params?.id) {
      fetchListing();
    }
  }, [params?.id]);

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
        tags: selectedTags,
        userId: user.uid,
        ...(isEditing ? {} : { createdAt: new Date().toISOString() }),
      };

      if (isEditing && params?.id) {
        const listingRef = doc(db, 'listings', params.id);
        await updateDoc(listingRef, listingData);
        toast({
          title: "Успешно редактирана обява",
          description: "Вашата обява беше обновена успешно",
        });
      } else {
        const listingsRef = collection(db, 'listings');
        await addDoc(listingsRef, listingData);
        toast({
          title: "Успешно създадена обява",
          description: "Вашата обява беше публикувана успешно",
        });
      }

      setLocation("/listings");
    } catch (error: any) {
      console.error("Error with listing:", error);
      toast({
        title: "Грешка",
        description: error.message || "Възникна проблем при обработката на обявата",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    form.setValue("images", images);
  }, [images, form]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(current => {
      const newTags = current.includes(tagId)
        ? current.filter(id => id !== tagId)
        : [...current, tagId];
      form.setValue("tags", newTags);
      return newTags;
    });
  };

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isEditing ? "Редактирай обява" : "Създай нова обява"}
          </CardTitle>
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
                      <Input 
                        placeholder="Въведете заглавие на обявата" 
                        {...field} 
                        maxLength={50}
                      />
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ageYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Години</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          placeholder="Години"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ageMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Месеци</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="11"
                          placeholder="Месеци"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Локация</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Въведете локация (град, квартал)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Изберете статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">За осиновяване</SelectItem>
                        <SelectItem value="adopted">Осиновен</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Тагове</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {availableTags.map((tag) => (
                    <div key={tag.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={tag.id}
                        checked={selectedTags.includes(tag.id)}
                        onCheckedChange={() => handleTagToggle(tag.id)}
                      />
                      <label
                        htmlFor={tag.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {tag.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Опишете любимеца подробно..."
                        className="min-h-[120px] resize-none whitespace-pre-wrap"
                        maxLength={300}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <div className="text-sm text-gray-500">
                      {field.value.length}/300 символа
                    </div>
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
                    {isEditing ? "Обновяване..." : "Създаване..."}
                  </>
                ) : (
                  isEditing ? "Обнови обява" : "Създай обява"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}