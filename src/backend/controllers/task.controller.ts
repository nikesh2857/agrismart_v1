import { Request, Response, NextFunction } from 'express';
import * as taskService from '../services/task.service';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1),
  date: z.string().datetime().or(z.string()),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['PENDING', 'COMPLETED']).optional(),
});

export const listTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tasks = await taskService.listTasks(req.user!.id);
    res.json(tasks);
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, date } = createTaskSchema.parse(req.body);
    const parsedDate = new Date(date);
    const task = await taskService.createTask(req.user!.id, title, parsedDate);
    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, title } = updateTaskSchema.parse(req.body);
    const task = await taskService.updateTask(req.user!.id, req.params.id, status, title);
    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await taskService.deleteTask(req.user!.id, req.params.id);
    res.json({ success: true, id: req.params.id });
  } catch (error) {
    next(error);
  }
};
