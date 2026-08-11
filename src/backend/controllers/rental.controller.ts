import { Request, Response, NextFunction } from 'express';
import { createRentalSchema, equipmentQuerySchema } from '../validators/rental.validator';
import * as rentalService from '../services/rental.service';

export const listEquipment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = equipmentQuerySchema.parse(req.query);
    const result = await rentalService.listEquipment(page, limit);
    res.json(result);
  } catch (err) { next(err); }
};

export const getAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = req.query as { startDate: string; endDate: string };
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query params are required' });
    }
    const result = await rentalService.getEquipmentAvailability(
      req.params.id,
      new Date(startDate),
      new Date(endDate)
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const createRental = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRentalSchema.parse(req.body) as { equipmentId: string; startDate: string; endDate: string };
    const rental = await rentalService.createRental(req.user.id, data);
    res.status(201).json({ rental });
  } catch (err) { next(err); }
};

export const listRentals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rentals = await rentalService.listRentals(req.user.id, req.user.role);
    res.json({ rentals });
  } catch (err) { next(err); }
};

export const cancelRental = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rental = await rentalService.cancelRental(req.params.id, req.user.id, req.user.role);
    res.json({ rental });
  } catch (err) { next(err); }
};
