import prisma from '../config/prisma';
import { Prisma, ProductCategory } from '@prisma/client';

const PAGE_SIZE = 12;

// ─── Products ─────────────────────────────────────────────────────────────────

export const listProducts = async (opts: {
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? PAGE_SIZE;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(opts.category && { category: opts.category as ProductCategory }),
    ...(opts.search && {
      OR: [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { seller: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pages: Math.ceil(total / limit) };
};

export const getProduct = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { seller: { select: { id: true, name: true, avatarUrl: true } } },
  });
  if (!product) throw new Error('Product not found');
  return product;
};

export const createProduct = async (
  sellerId: string,
  data: { name: string; description?: string; category?: string; price: number; stock: number; imageUrl?: string }
) => {
  return prisma.product.create({
    data: {
      sellerId,
      name: data.name,
      description: data.description,
      category: (data.category ?? 'OTHER') as ProductCategory,
      price: data.price,
      stock: data.stock,
      imageUrl: data.imageUrl,
    },
  });
};

export const updateProduct = async (id: string, sellerId: string, role: string, data: Partial<{
  name: string; description: string; category: string; price: number; stock: number; imageUrl: string;
}>) => {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) throw new Error('Product not found');
  const isAdmin = role?.toUpperCase() === 'ADMIN';
  if (!isAdmin && product.sellerId !== sellerId) throw new Error('Forbidden');

  return prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.category !== undefined && { category: data.category as ProductCategory }),
      ...(data.price !== undefined && { price: data.price }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
    },
  });
};

export const deleteProduct = async (id: string, sellerId: string, role: string) => {
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null } });
  if (!product) throw new Error('Product not found');
  const isAdmin = role?.toUpperCase() === 'ADMIN';
  if (!isAdmin && product.sellerId !== sellerId) throw new Error('Forbidden');

  // Soft delete to preserve order history integrity
  return prisma.product.update({ where: { id }, data: { deletedAt: new Date() } });
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const createOrder = async (
  buyerId: string,
  items: { productId: string; quantity: number }[]
) => {
  return prisma.$transaction(async (tx) => {
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData: { productId: string; quantity: number; priceAtPurchase: Prisma.Decimal }[] = [];

    for (const item of items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, deletedAt: null },
        select: { id: true, price: true, stock: true, name: true },
      });

      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
      }

      // Lock stock decrement inside the transaction
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });

      const lineTotal = product.price.mul(item.quantity);
      totalAmount = totalAmount.add(lineTotal);
      orderItemsData.push({ productId: item.productId, quantity: item.quantity, priceAtPurchase: product.price });
    }

    const order = await tx.order.create({
      data: {
        buyerId,
        totalAmount,
        items: { create: orderItemsData },
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true } } },
        },
      },
    });

    return order;
  });
};

export const listOrders = async (userId: string, role: string) => {
  const where = role?.toUpperCase() === 'ADMIN' ? {} : { buyerId: userId };
  return prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
    },
  });
};

export const updateOrderStatus = async (orderId: string, status: string, userId: string, role: string) => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  const isAdmin = role?.toUpperCase() === 'ADMIN';
  if (!isAdmin && order.buyerId !== userId) throw new Error('Forbidden');

  return prisma.order.update({ where: { id: orderId }, data: { status: status as any } });
};
