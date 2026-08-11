import { Router } from 'express';
import { sync, register } from '../controllers/auth.controller';
import prisma from '../config/prisma';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user bypassing SMTP email rate limits
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/sync:
 *   post:
 *     summary: Sync user to database
 *     security:
 *       - bearerAuth: []
 */
router.post('/sync', sync);

/**
 * @swagger
 * /api/auth/phone:
 *   post:
 *     summary: Mock Phone Login synchronization
 */
router.post('/phone', async (req, res) => {
  const { phoneNumber, role, name } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  try {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    // Ensure unique uid for database mapping
    const mockUid = `phone_${cleanPhone.replace(/[^0-9]/g, '')}`;
    const email = `${mockUid}@phone.agrismart.com`;
    
    const user = await prisma.user.upsert({
      where: { firebaseUid: mockUid },
      update: name ? { name } : {},
      create: {
        firebaseUid: mockUid,
        email,
        name: name || `User ${cleanPhone.slice(-4)}`,
        role: role || 'FARMER'
      }
    });
    
    res.json({
      user: {
        id: user.firebaseUid,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Phone login sync failed:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   patch:
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 */
router.patch('/profile', requireAuth, async (req, res) => {
  const { name, avatarUrl, phone } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        name: name !== undefined ? name : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        phone: phone !== undefined ? phone : undefined,
      },
    });
    
    res.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        avatarUrl: updatedUser.avatarUrl,
        email: updatedUser.email,
        phone: updatedUser.phone
      }
    });
  } catch (err: any) {
    console.error('Failed to update user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

/**
 * @swagger
 * /api/auth/profile/upload:
 *   post:
 *     summary: Upload profile picture
 *     security:
 *       - bearerAuth: []
 */
router.post('/profile/upload', requireAuth, upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

export default router;
