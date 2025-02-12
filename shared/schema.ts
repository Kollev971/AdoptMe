import { z } from "zod";

export const userSchema = z.object({
  uid: z.string(),
  username: z.string().min(3),
  email: z.string().email(),
  fullName: z.string().min(2),
  phone: z.string().min(10),
  photoURL: z.string().optional(),
  createdAt: z.string(),
  emailVerified: z.boolean(),
});

export const listingSchema = z.object({
  id: z.string(),
  title: z.string().min(5),
  type: z.enum(['dog', 'cat', 'other']),
  age: z.number().min(0),
  description: z.string().min(20),
  images: z.array(z.string()),
  userId: z.string(),
  createdAt: z.string(),
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

export type User = z.infer<typeof userSchema>;
export type Listing = z.infer<typeof listingSchema>;
export type AdoptionRequest = z.infer<typeof adoptionRequestSchema>;