import prisma from '../config/prisma';
import { Role } from '@prisma/client';

// ─── Platform Overview ────────────────────────────────────────────────────────

export const getPlatformStats = async () => {
  const [
    totalUsers,
    usersByRole,
    totalJobs,
    jobsByStatus,
    totalOrders,
    totalRevenue,
    totalProducts,
    totalEquipment,
    totalRentals,
    rentalRevenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
    prisma.job.count(),
    prisma.job.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { notIn: ['CANCELLED', 'REFUNDED'] } } }),
    prisma.product.count({ where: { deletedAt: null } }),
    prisma.equipment.count(),
    prisma.rental.count(),
    prisma.rental.aggregate({ _sum: { totalCost: true }, where: { status: { notIn: ['CANCELLED'] } } }),
  ]);

  return {
    users: {
      total: totalUsers,
      byRole: usersByRole.reduce((acc: Record<string, number>, r: any) => {
        acc[r.role] = r._count.id;
        return acc;
      }, {}),
    },
    jobs: {
      total: totalJobs,
      byStatus: jobsByStatus.reduce((acc: Record<string, number>, r: any) => {
        acc[r.status] = r._count.id;
        return acc;
      }, {}),
    },
    marketplace: {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
      activeProducts: totalProducts,
    },
    equipment: {
      total: totalEquipment,
      totalRentals,
      rentalRevenue: rentalRevenue._sum.totalCost ?? 0,
    },
  };
};

// ─── Revenue Over Time ────────────────────────────────────────────────────────

export const getRevenueTimeline = async (from?: Date, to?: Date) => {
  const where: any = {
    status: { notIn: ['CANCELLED', 'REFUNDED'] },
    ...(from && { createdAt: { gte: from } }),
    ...(to && { createdAt: { lte: to } }),
  };

  // Get orders grouped by day using raw aggregation
  const orders = await prisma.order.findMany({
    where,
    select: { createdAt: true, totalAmount: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by day on the application side (avoids raw SQL dependency)
  const dayMap = new Map<string, number>();
  for (const o of orders) {
    const day = o.createdAt.toISOString().slice(0, 10);
    const prev = dayMap.get(day) ?? 0;
    dayMap.set(day, prev + Number(o.totalAmount));
  }

  return Array.from(dayMap.entries()).map(([date, revenue]) => ({ date, revenue }));
};

// ─── User Management ──────────────────────────────────────────────────────────

export const listAllUsers = async (page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    }),
    prisma.user.count(),
  ]);
  return { users, total, page, pages: Math.ceil(total / limit) };
};

export const updateUserRole = async (userId: string, role: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { role: role as Role },
    select: { id: true, email: true, name: true, role: true },
  });
};

// ─── Product Management ───────────────────────────────────────────────────────

export const hardDeleteProduct = async (productId: string) => {
  // Admin-only permanent delete (fallback to soft delete if order items exist)
  try {
    return await prisma.product.delete({ where: { id: productId } });
  } catch (_err) {
    return await prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
  }
};

// ─── Recent Activity Feed ──────────────────────────────────────────────────────

export const getRecentActivity = async (limit = 20) => {
  const [recentJobs, recentOrders, recentRentals] = await Promise.all([
    prisma.job.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, workName: true, status: true, createdAt: true, farmer: { select: { name: true, email: true } } },
    }),
    prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, totalAmount: true, status: true, createdAt: true, buyer: { select: { name: true, email: true } } },
    }),
    prisma.rental.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: { id: true, startDate: true, endDate: true, totalCost: true, status: true, createdAt: true, equipment: { select: { name: true } }, renter: { select: { name: true } } },
    }),
  ]);

  // Merge and sort by date — cast to common shape to satisfy TS union
  type ActivityItem = { type: string; id: string; title: string | undefined; actor: string | null | undefined; createdAt: Date; status: string };

  const activity: ActivityItem[] = [
    ...recentJobs.map((j) => ({ type: 'JOB', id: j.id, title: j.workName, actor: j.farmer?.name ?? null, createdAt: j.createdAt, status: j.status as string })),
    ...recentOrders.map((o) => ({ type: 'ORDER', id: o.id, title: `Order #${o.id.slice(0, 8)}`, actor: o.buyer?.name ?? null, createdAt: o.createdAt, status: o.status as string })),
    ...recentRentals.map((r) => ({ type: 'RENTAL', id: r.id, title: r.equipment?.name ?? '', actor: r.renter?.name ?? null, createdAt: r.createdAt, status: r.status as string })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);

  return activity;
};
