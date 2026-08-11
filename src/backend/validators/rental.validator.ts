import { z } from 'zod';

export const createRentalSchema = z.object({
  equipmentId: z.string().min(1, 'Invalid equipment ID'),
  startDate: z.string().transform(val => val.includes('T') ? val.split('T')[0] : val).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be YYYY-MM-DD')),
  endDate: z.string().transform(val => val.includes('T') ? val.split('T')[0] : val).pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be YYYY-MM-DD')),
}).refine((d) => new Date(d.endDate) >= new Date(d.startDate), {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const equipmentQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});
