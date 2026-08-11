import { Request, Response, NextFunction } from 'express';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createOrderSchema,
} from '../validators/marketplace.validator';
import * as marketplaceService from '../services/marketplace.service';

// ─── Products ─────────────────────────────────────────────────────────────────

export const listProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const opts = productQuerySchema.parse(req.query);
    const result = await marketplaceService.listProducts(opts);
    res.json(result);
  } catch (err) { next(err); }
};

export const getProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await marketplaceService.getProduct(req.params.id);
    res.json({ product });
  } catch (err) { next(err); }
};

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createProductSchema.parse(req.body);
    const product = await marketplaceService.createProduct(req.user.id, data);
    res.status(201).json({ product });
  } catch (err) { next(err); }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updateProductSchema.parse(req.body);
    const product = await marketplaceService.updateProduct(req.params.id, req.user.id, req.user.role, data);
    res.json({ product });
  } catch (err) { next(err); }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await marketplaceService.deleteProduct(req.params.id, req.user.id, req.user.role);
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ─── Orders ───────────────────────────────────────────────────────────────────

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { items, deliveryAddress, contactPhone } = createOrderSchema.parse(req.body);
    const order = await marketplaceService.createOrder(req.user.id, items, { deliveryAddress, contactPhone });
    res.status(201).json({ order });
  } catch (err) { next(err); }
};

export const listOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await marketplaceService.listOrders(req.user.id, req.user.role);
    res.json({ orders });
  } catch (err) { next(err); }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.body as { status: string };
    const order = await marketplaceService.updateOrderStatus(req.params.id, status, req.user.id, req.user.role);
    res.json({ order });
  } catch (err) { next(err); }
};
