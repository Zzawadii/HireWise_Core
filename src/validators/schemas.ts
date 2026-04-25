import { z } from 'zod';

export const applicantSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  skills: z.array(z.string()).min(1, 'At least one skill required'),
  experience: z.string().min(1, 'Experience is required'),
  education: z.string().min(1, 'Education is required'),
  resumeUrl: z.string().url().optional(),
});

export const jobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  skills: z.array(z.string()).min(1, 'At least one skill required'),
  experience: z.string().min(1, 'Experience is required'),
  education: z.string().min(1, 'Education is required'),
});

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});