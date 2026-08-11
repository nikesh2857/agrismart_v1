import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import * as marketplaceController from '../controllers/marketplace.controller';

const router = Router();

// ─── Products ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products (public)
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string, enum: [SEEDS, FERTILIZERS, PESTICIDES, TOOLS, MACHINERY, OTHER] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Paginated product list }
 */
router.get('/products', marketplaceController.listProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get single product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Product detail }
 *       404: { description: Not found }
 */
router.get('/products/:id', marketplaceController.getProduct);

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create product (Farmer/Admin)
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, stock]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               category: { type: string }
 *               price: { type: number }
 *               stock: { type: integer }
 *               imageUrl: { type: string }
 *     responses:
 *       201: { description: Product created }
 */
router.post('/products', requireAuth, requireRole(['FARMER', 'ADMIN']), marketplaceController.createProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Update product (Seller or Admin)
 *     security: [{bearerAuth: []}]
 */
router.patch('/products/:id', requireAuth, requireRole(['FARMER', 'ADMIN']), marketplaceController.updateProduct);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Soft-delete product (Seller or Admin)
 *     security: [{bearerAuth: []}]
 */
router.delete('/products/:id', requireAuth, requireRole(['FARMER', 'ADMIN']), marketplaceController.deleteProduct);

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create order with atomic stock decrement
 *     security: [{bearerAuth: []}]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *     responses:
 *       201: { description: Order created }
 *       400: { description: Insufficient stock }
 */
router.post('/orders', requireAuth, marketplaceController.createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders (own orders or all for Admin)
 *     security: [{bearerAuth: []}]
 */
router.get('/orders', requireAuth, marketplaceController.listOrders);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status (Admin)
 *     security: [{bearerAuth: []}]
 */
router.patch('/orders/:id/status', requireAuth, marketplaceController.updateOrderStatus);

export default router;
