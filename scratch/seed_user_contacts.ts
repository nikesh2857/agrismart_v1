import prisma from '../src/backend/config/prisma';

async function main() {
  // Update S.NIKESH (Farmer)
  await prisma.user.updateMany({
    where: { name: { contains: 'NIKESH', mode: 'insensitive' } },
    data: {
      phone: '+91 98765 43210',
      place: 'Guntur, Andhra Pradesh'
    }
  });

  // Update other users missing phone or place
  await prisma.user.updateMany({
    where: { phone: null },
    data: {
      phone: '+91 91234 56789',
      place: 'Vijayawada, Andhra Pradesh'
    }
  });

  // Update existing orders
  await prisma.order.updateMany({
    where: { deliveryAddress: null },
    data: {
      contactPhone: '+91 98765 43210',
      deliveryAddress: 'Main Farm Rd, Guntur, AP - 522002'
    }
  });

  console.log('✅ Updated database users and orders with Phone Number and Place!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
