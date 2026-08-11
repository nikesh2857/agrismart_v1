import prisma from '../config/prisma';
import { Role } from '@prisma/client';

export const syncUser = async (
  firebaseUid: string,
  email: string,
  name: string,
  avatarUrl: string,
  requestedRole?: string
) => {
  // Determine role — never allow self-promotion to ADMIN via sync endpoint
  let targetRole: Role = Role.FARMER;
  if (requestedRole && Object.values(Role).includes(requestedRole as Role) && requestedRole !== 'ADMIN') {
    targetRole = requestedRole as Role;
  }

  // 1. Check if user exists by firebaseUid first
  let existing = await prisma.user.findUnique({ where: { firebaseUid } });

  // 2. Check by email if not found by firebaseUid
  if (!existing && email) {
    existing = await prisma.user.findUnique({ where: { email } });
  }

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        firebaseUid,
        name: name || existing.name,
        avatarUrl: avatarUrl || existing.avatarUrl,
        role: requestedRole && requestedRole !== 'ADMIN' ? targetRole : existing.role
      }
    });
  }

  // 3. Create new user if not found
  return prisma.user.create({
    data: {
      firebaseUid,
      email,
      name: name || null,
      avatarUrl: avatarUrl || null,
      role: targetRole,
    },
  });
};
