import prisma from '../src/backend/config/prisma';

async function checkOrders() {
  const orders = await prisma.order.findMany({
    include: {
      buyer: true,
      items: {
        include: {
          product: {
            include: {
              seller: true
            }
          }
        }
      }
    }
  });

  console.log(`Total orders in DB: ${orders.length}`);
  console.log(JSON.stringify(orders, null, 2));

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true }
  });
  console.log(`Total users in DB: ${users.length}`);
  console.log(JSON.stringify(users, null, 2));

  await prisma.$disconnect();
}

checkOrders().catch(err => {
  console.error(err);
  process.exit(1);
});
