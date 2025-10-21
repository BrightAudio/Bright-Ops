import { z } from 'zod';

export const clientSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
});

export const jobSchema = z.object({
  id: z.string().optional(),
  created_at: z.string().optional(),
  code: z.string().min(1, 'Job code is required'),
  title: z.string().optional().nullable(),
  client_id: z.string().min(1, 'Client is required'),
  venue: z.string().optional().nullable(),
  start_at: z.string().optional().nullable(),
  end_at: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
export type JobFormData = z.infer<typeof jobSchema>;