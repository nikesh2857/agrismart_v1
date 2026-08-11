import prisma from '../config/prisma';
import { Prisma } from '@prisma/client';

const PAGE_SIZE = 10;

export const listEquipment = async (page = 1, limit = PAGE_SIZE) => {
  const skip = (page - 1) * limit;
  const [equipment, total] = await Promise.all([
    prisma.equipment.findMany({ skip, take: limit, orderBy: { name: 'asc' } }),
    prisma.equipment.count(),
  ]);
  return { equipment, total, page, pages: Math.ceil(total / limit) };
};

/**
 * Return booked date ranges for a given piece of equipment so the
 * frontend date-picker can disable them.
 */
export const getEquipmentAvailability = async (equipmentId: string, startDate: Date, endDate: Date) => {
  const equipment = await prisma.equipment.findUnique({ where: { id: equipmentId } });
  if (!equipment) throw new Error('Equipment not found');

  // Overlapping active rentals within the queried range
  const overlapping = await prisma.rental.findMany({
    where: {
      equipmentId,
      status: { in: ['RESERVED', 'ACTIVE'] },
      AND: [
        { startDate: { lte: endDate } },
        { endDate: { gte: startDate } },
      ],
    },
    select: { startDate: true, endDate: true },
  });

  // Count max concurrent units booked on each day
  // Simple approach: return the unavailable date windows (enough for frontend)
  const fullyBooked = overlapping.filter(() => {
    // If inventoryCount == 1, any overlap means fully booked
    // For multi-unit equipment this would be a SUM query — kept simple here
    return true;
  });

  return {
    equipment,
    unavailablePeriods: fullyBooked.map((r) => ({
      startDate: r.startDate,
      endDate: r.endDate,
    })),
    availableUnits: equipment.inventoryCount - overlapping.length < 0 ? 0 : equipment.inventoryCount - overlapping.length,
  };
};

export const createRental = async (
  renterId: string,
  data: { equipmentId: string; startDate: string; endDate: string }
) => {
  return prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.findUnique({ where: { id: data.equipmentId } });
    if (!equipment) throw new Error('Equipment not found');

    const start = new Date(data.startDate);
    const end = new Date(data.endDate);

    // Check for overlapping RESERVED/ACTIVE rentals
    const overlapping = await tx.rental.count({
      where: {
        equipmentId: data.equipmentId,
        status: { in: ['RESERVED', 'ACTIVE'] },
        AND: [
          { startDate: { lte: end } },
          { endDate: { gte: start } },
        ],
      },
    });

    if (overlapping >= equipment.inventoryCount) {
      throw new Error('Equipment is not available for the requested dates');
    }

    // Calculate total cost
    const diffMs = end.getTime() - start.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1; // inclusive
    const totalCost = equipment.dailyRate.mul(days);

    return tx.rental.create({
      data: {
        equipmentId: data.equipmentId,
        renterId,
        startDate: start,
        endDate: end,
        totalCost,
        status: 'RESERVED',
      },
      include: { equipment: { select: { id: true, name: true } } },
    });
  });
};

export const listRentals = async (userId: string, role: string) => {
  const where = role?.toUpperCase() === 'ADMIN' ? {} : { renterId: userId };
  return prisma.rental.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { equipment: { select: { id: true, name: true, imageUrl: true } } },
  });
};

export const cancelRental = async (rentalId: string, userId: string, role: string) => {
  const rental = await prisma.rental.findUnique({ where: { id: rentalId } });
  if (!rental) throw new Error('Rental not found');
  if (role?.toUpperCase() !== 'ADMIN' && rental.renterId !== userId) throw new Error('Forbidden');
  if (rental.status === 'COMPLETED') throw new Error('Cannot cancel a completed rental');

  return prisma.rental.update({ where: { id: rentalId }, data: { status: 'CANCELLED' } });
};
