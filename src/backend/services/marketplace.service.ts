import prisma from '../config/prisma';
import { Prisma, ProductCategory } from '@prisma/client';
import { sendNotification } from '../config/socket';

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
      include: { seller: { select: { id: true, name: true, avatarUrl: true, email: true, phone: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, pages: Math.ceil(total / limit) };
};

export const getProduct = async (id: string) => {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: { seller: { select: { id: true, name: true, avatarUrl: true, email: true, phone: true } } },
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
      category: (data.category as ProductCategory) || 'OTHER',
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
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, name: true, email: true, phone: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    let totalAmount = new Prisma.Decimal(0);
    const orderItemsData: { productId: string; quantity: number; priceAtPurchase: Prisma.Decimal }[] = [];

    for (const item of items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, deletedAt: null },
        select: { id: true, price: true, stock: true, name: true, sellerId: true },
      });

      if (!product) throw new Error(`Product ${item.productId} not found`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock}`);
      }

      // Lock stock decrement inside transaction
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });

      const lineTotal = product.price.mul(item.quantity);
      totalAmount = totalAmount.add(lineTotal);
      orderItemsData.push({ productId: item.productId, quantity: item.quantity, priceAtPurchase: product.price });
    }

    return tx.order.create({
      data: {
        buyerId,
        totalAmount,
        items: { create: orderItemsData },
      },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                seller: { select: { id: true, name: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    });
  });

  // Send Contact Info Sharing Notifications
  if (buyer && order && order.items) {
    const buyerPhone = buyer.phone || 'Phone not provided';
    const buyerEmail = buyer.email || 'Email not provided';

    for (const item of order.items) {
      const product = item.product;
      const seller = product?.seller;

      if (seller) {
        const sellerPhone = seller.phone || 'Phone not provided';
        const sellerEmail = seller.email || 'Email not provided';

        // 1. Send Seller (Farmer) Notification with Customer's Contact Info
        await sendNotification(
          seller.id,
          '📦 New Order Received!',
          `Customer "${buyer.name}" placed an order for "${product.name}". Customer Contact -> Phone: ${buyerPhone}, Email: ${buyerEmail}`
        );

        // 2. Send Buyer (Customer) Notification with Seller (Farmer)'s Contact Info
        await sendNotification(
          buyer.id,
          '🎉 Order Confirmed!',
          `Your order for "${product.name}" is confirmed. Seller (${seller.name}) Contact -> Phone: ${sellerPhone}, Email: ${sellerEmail}`
        );
      }
    }
  }

  return order;
};

export const listOrders = async (userId: string, role: string) => {
  const isUserAdmin = role?.toUpperCase() === 'ADMIN';
  const isUserFarmer = role?.toUpperCase() === 'FARMER';

  let where: Prisma.OrderWhereInput = {};
  if (!isUserAdmin) {
    if (isUserFarmer) {
      where = {
        OR: [
          { buyerId: userId },
          { items: { some: { product: { sellerId: userId } } } },
        ],
      };
    } else {
      where = { buyerId: userId };
    }
  }

  return prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
              seller: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
            },
          },
        },
      },
    },
  });
};

export const updateOrderStatus = async (orderId: string, status: string, userId: string, role: string) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { sellerId: true } } } } },
  });
  if (!order) throw new Error('Order not found');

  const isAdmin = role?.toUpperCase() === 'ADMIN';
  const isBuyer = order.buyerId === userId;
  const isSeller = order.items.some(i => i.product?.sellerId === userId);

  if (!isAdmin && !isBuyer && !isSeller) throw new Error('Forbidden');

  return prisma.order.update({ where: { id: orderId }, data: { status: status as any } });
};
