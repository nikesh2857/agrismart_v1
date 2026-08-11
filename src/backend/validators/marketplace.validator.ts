import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Product name too short'),
  description: z.string().optional(),
  category: z.enum(['SEEDS', 'FERTILIZERS', 'PESTICIDES', 'TOOLS', 'MACHINERY', 'OTHER']).default('OTHER').or(z.string().transform(() => 'OTHER')),
  price: z.number().positive('Price must be positive'),
  stock: z.number().int().min(0, 'Stock cannot be negative'),
  imageUrl: z.string().optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  category: z.enum(['SEEDS', 'FERTILIZERS', 'PESTICIDES', 'TOOLS', 'MACHINERY', 'OTHER']).optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1, 'Invalid product ID'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'Order must contain at least one item'),
});
