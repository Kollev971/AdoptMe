import { z } from "zod";

// Подобрена валидация на паролата
const passwordSchema = z.string()
  .min(8, "Паролата трябва да е поне 8 символа")
  .regex(/[A-Z]/, "Паролата трябва да съдържа поне една главна буква")
  .regex(/[a-z]/, "Паролата трябва да съдържа поне една малка буква")
  .regex(/[0-9]/, "Паролата трябва да съдържа поне една цифра")
  .regex(/[^A-Za-z0-9]/, "Паролата трябва да съдържа поне един специален символ");

export const userSchema = z.object({
  uid: z.string(),
  username: z.string().min(3),
  email: z.string().email(),
  fullName: z.string().min(2),
  phone: z.string().min(10),
  photoURL: z.string().optional(),
  bio: z.string().optional(),
  createdAt: z.string(),
  emailVerified: z.boolean(),
});

export const listingSchema = z.object({
  id: z.string(),
  title: z.string().min(5).max(50),
  type: z.enum(['dog', 'cat', 'other']),
  ageYears: z.number().min(0).max(30),
  ageMonths: z.number().min(0).max(11),
  description: z.string().min(20).max(300),
  images: z.array(z.string()),
  userId: z.string(),
  createdAt: z.string(),
  location: z.string().optional(),
  status: z.enum(['available', 'adopted']).default('available'),
  tags: z.array(z.enum([
    'vaccinated',      // ваксиниран
    'neutered',        // кастриран
    'dewormed',        // обезпаразитен
    'special_needs',   // специални нужди
    'child_friendly',  // подходящ за деца
    'trained'          // обучен
  ])).default([]),
});

export const adoptionRequestSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  userId: z.string(),
  ownerId: z.string(), 
  message: z.string().min(10),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.string(),
});

// Схема за регистрация
export const registerSchema = userSchema
  .omit({ 
    uid: true, 
    emailVerified: true, 
    createdAt: true, 
    photoURL: true 
  })
  .extend({
    password: passwordSchema,
    confirmPassword: z.string()
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Паролите не съвпадат",
    path: ["confirmPassword"],
  });

export type User = z.infer<typeof userSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type AdoptionRequest = z.infer<typeof adoptionRequestSchema>;
export type RegisterData = z.infer<typeof registerSchema>;