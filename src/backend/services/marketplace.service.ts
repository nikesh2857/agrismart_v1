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
  items: { productId: string; quantity: number }[],
  details?: { deliveryAddress?: string; contactPhone?: string }
) => {
  const buyer = await prisma.user.findUnique({
    where: { id: buyerId },
    select: { id: true, name: true, email: true, phone: true, place: true },
  });

  // If buyer supplied contact details, update user profile if missing
  if (buyer && (details?.contactPhone || details?.deliveryAddress)) {
    await prisma.user.update({
      where: { id: buyerId },
      data: {
        ...(details.contactPhone && !buyer.phone && { phone: details.contactPhone }),
        ...(details.deliveryAddress && !buyer.place && { place: details.deliveryAddress }),
      },
    });
  }

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
        deliveryAddress: details?.deliveryAddress || buyer?.place || undefined,
        contactPhone: details?.contactPhone || buyer?.phone || undefined,
        items: { create: orderItemsData },
      },
      include: {
        buyer: { select: { id: true, name: true, email: true, phone: true, place: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                seller: { select: { id: true, name: true, email: true, phone: true, place: true } },
              },
            },
          },
        },
      },
    });
  });

  // Send Contact Info Sharing Notifications
  if (buyer && order && order.items) {
    const buyerPhone = details?.contactPhone || buyer.phone || 'Phone not provided';
    const buyerEmail = buyer.email || 'Email not provided';
    const buyerPlace = details?.deliveryAddress || buyer.place || 'Location not specified';

    for (const item of order.items) {
      const product = item.product;
      const seller = product?.seller;

      if (seller) {
        const sellerPhone = seller.phone || 'Phone not provided';
        const sellerEmail = seller.email || 'Email not provided';
        const sellerPlace = seller.place || 'Location not specified';

        // 1. Send Seller (Farmer) Notification with Customer's Contact Info
        await sendNotification(
          seller.id,
          '📦 New Order Received!',
          `Customer "${buyer.name || 'Customer'}" bought "${product.name}". Contact -> Phone: ${buyerPhone}, Email: ${buyerEmail}, Place: ${buyerPlace}`
        );

        // 2. Send Buyer (Customer) Notification with Seller (Farmer)'s Contact Info
        await sendNotification(
          buyer.id,
          '🎉 Order Confirmed!',
          `Order for "${product.name}" confirmed. Farmer (${seller.name || 'Seller'}) Contact -> Phone: ${sellerPhone}, Email: ${sellerEmail}, Place: ${sellerPlace}`
        );
      }
    }
  }

  return order;
};

export const listOrders = async (userId: string, role: string) => {
  const isUserAdmin = role?.toUpperCase() === 'ADMIN';

  const where: Prisma.OrderWhereInput = isUserAdmin
    ? {}
    : {
        OR: [
          { buyerId: userId },
          { items: { some: { product: { sellerId: userId } } } },
        ],
      };

  return prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      buyer: { select: { id: true, name: true, email: true, phone: true, place: true, avatarUrl: true } },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              price: true,
              seller: { select: { id: true, name: true, email: true, phone: true, place: true, avatarUrl: true } },
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
    include: {
      buyer: { select: { id: true, name: true, email: true } },
      items: { include: { product: { select: { id: true, name: true, sellerId: true } } } },
    },
  });
  if (!order) throw new Error('Order not found');

  const isAdmin = role?.toUpperCase() === 'ADMIN';
  const isBuyer = order.buyerId === userId;
  const isSeller = order.items.some(i => i.product?.sellerId === userId);

  if (!isAdmin && !isBuyer && !isSeller) throw new Error('Forbidden');

  const targetStatus = status.toUpperCase();

  // If order is cancelled and wasn't previously cancelled, restore stock
  if (targetStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
    for (const item of order.items) {
      if (item.productId && item.quantity > 0) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { status: targetStatus as any },
  });

  // Send notifications for order state changes
  if (targetStatus === 'CANCELLED') {
    if (order.buyer) {
      await sendNotification(order.buyer.id, '❌ Order Cancelled', `Order #${orderId.slice(-8)} has been cancelled.`);
    }
    for (const item of order.items) {
      if (item.product?.sellerId) {
        await sendNotification(item.product.sellerId, '❌ Order Cancelled', `Order #${orderId.slice(-8)} for "${item.product.name}" was cancelled.`);
      }
    }
  } else if (targetStatus === 'DELIVERED' || targetStatus === 'COMPLETED' || targetStatus === 'SUCCESSFUL') {
    if (order.buyer) {
      await sendNotification(order.buyer.id, '🎉 Order Completed!', `Order #${orderId.slice(-8)} is marked as Successful / Delivered!`);
    }
    for (const item of order.items) {
      if (item.product?.sellerId) {
        await sendNotification(item.product.sellerId, '🎉 Order Successful!', `Order #${orderId.slice(-8)} for "${item.product.name}" is marked as Successful!`);
      }
    }
  }

  return updatedOrder;
};
