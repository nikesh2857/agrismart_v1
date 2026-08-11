/**
 * Prisma Seed Script
 * Run with: npx prisma db seed
 *
 * Seeds the database with:
 *  - Sample marketplace products
 *  - Sample equipment for rental
 */
import 'dotenv/config';
import { PrismaClient, ProductCategory } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const SEED_SELLER_FIREBASE_UID = 'seed-seller-001';
const SEED_SELLER_EMAIL = 'seed-seller@agrismart.dev';

const slugify = (text: string, maxLength: number): string => {
  return text
    .slice(0, maxLength)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ── Seed seller user (needed as FK for products) ──────────────────────────
  const seller = await prisma.user.upsert({
    where: { firebaseUid: SEED_SELLER_FIREBASE_UID },
    update: {},
    create: {
      firebaseUid: SEED_SELLER_FIREBASE_UID,
      email: SEED_SELLER_EMAIL,
      name: 'AgriSmart Demo Seller',
      role: 'FARMER',
    },
  });
  console.log(`✅ Seed seller: ${seller.email}`);

  // ── Products ────────────────────────────────────────────────────────────────
  const products = [
    { name: 'Premium Wheat Seeds (5 kg)', category: 'SEEDS' as ProductCategory, price: 349, stock: 200, description: 'High-yield certified wheat variety, drought resistant. Suitable for Rabi season.' },
    { name: 'Hybrid Tomato Seeds (50g)', category: 'SEEDS' as ProductCategory, price: 129, stock: 500, description: 'F1 hybrid, disease resistant with high fruit setting rate.' },
    { name: 'Urea Fertilizer (50 kg bag)', category: 'FERTILIZERS' as ProductCategory, price: 1299, stock: 80, description: '46% nitrogen fertilizer for faster green growth.' },
    { name: 'DAP Fertilizer (50 kg)', category: 'FERTILIZERS' as ProductCategory, price: 1549, stock: 60, description: 'Di-Ammonium Phosphate. Ideal for root development in all crops.' },
    { name: 'Neem-Based Pesticide (1L)', category: 'PESTICIDES' as ProductCategory, price: 299, stock: 150, description: 'Organic, broad-spectrum. Safe for bees and beneficial insects.' },
    { name: 'Chlorpyrifos 20% EC (500ml)', category: 'PESTICIDES' as ProductCategory, price: 449, stock: 90, description: 'Effective against termites, aphids, and soil insects.' },
    { name: 'Hand Sprayer (16L)', category: 'TOOLS' as ProductCategory, price: 799, stock: 45, description: 'Durable knapsack sprayer with adjustable nozzle for field use.' },
    { name: 'Soil pH Testing Kit', category: 'TOOLS' as ProductCategory, price: 249, stock: 120, description: 'Quick and accurate soil acidity/alkalinity testing strips.' },
    { name: 'Irrigation Drip Kit (1 acre)', category: 'TOOLS' as ProductCategory, price: 3499, stock: 25, description: 'Complete micro-drip irrigation system for water-efficient farming.' },
    { name: 'Organic Compost (25 kg)', category: 'FERTILIZERS' as ProductCategory, price: 399, stock: 200, description: 'Fully decomposed bio-organic compost to improve soil structure.' },
    { name: 'Maize Seeds (10 kg bag)', category: 'SEEDS' as ProductCategory, price: 499, stock: 180, description: 'High-yield Kharif maize seeds for tropical and subtropical climates.' },
    { name: 'Garden Hoe Set (3-piece)', category: 'TOOLS' as ProductCategory, price: 599, stock: 70, description: 'Forged steel head with ergonomic wooden handle, rust-resistant.' },
  ];

  for (const p of products) {
    const seedId = `seed-product-${slugify(p.name, 20)}`;
    const isSoftDeleted = p.name.includes('Chlorpyrifos');

    await prisma.product.upsert({
      where: { id: seedId },
      update: {
        stock: p.stock,
        price: p.price,
        deletedAt: isSoftDeleted ? new Date() : null,
      },
      create: {
        id: seedId,
        sellerId: seller.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        stock: p.stock,
        deletedAt: isSoftDeleted ? new Date() : null,
      },
    });
    console.log(`  📦 Product: ${p.name}`);
  }

  // ── Equipment ───────────────────────────────────────────────────────────────
  const equipment = [
    { name: 'Mahindra 475 DI Tractor', dailyRate: 2500, inventoryCount: 2, description: '47 HP 2WD tractor. Suitable for ploughing, tilling, and hauling.' },
    { name: 'Power Tiller (7 HP)', dailyRate: 800, inventoryCount: 3, description: 'Walk-behind tiller for small to medium plots. Petrol-powered.' },
    { name: 'Paddy Thresher', dailyRate: 1200, inventoryCount: 2, description: 'High-capacity paddy threshing machine. Reduces manual labour by 90%.' },
    { name: 'Mini Rice Transplanter', dailyRate: 1800, inventoryCount: 1, description: '4-row riding transplanter, transplants 1.5 acres/day. Diesel-powered.' },
    { name: 'Combine Harvester', dailyRate: 6000, inventoryCount: 1, description: 'Full-size combine for wheat, paddy, soybean. Covers 5 acres/day.' },
    { name: 'Rotavator (5 ft)', dailyRate: 1400, inventoryCount: 2, description: 'Tractor-mounted soil preparation attachment for perfect seedbed.' },
    { name: 'Pump Set (5 HP Diesel)', dailyRate: 600, inventoryCount: 4, description: 'Portable centrifugal pump for irrigation. 45,000 L/hour capacity.' },
    { name: 'Drone Sprayer (10L)', dailyRate: 3500, inventoryCount: 1, description: 'Agricultural drone for precision pesticide/fertilizer spraying. Covers 15 acres/charge.' },
  ];

  for (const e of equipment) {
    const seedId = `seed-equipment-${slugify(e.name, 15)}`;
    await prisma.equipment.upsert({
      where: { id: seedId },
      update: { dailyRate: e.dailyRate },
      create: {
        id: seedId,
        name: e.name,
        description: e.description,
        dailyRate: e.dailyRate,
        inventoryCount: e.inventoryCount,
      },
    });
    console.log(`  🚜 Equipment: ${e.name}`);
  }

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
