import { Request, Response, NextFunction } from 'express';
import { firebaseAuth } from '../config/firebase';
import { supabaseAdmin } from '../config/supabase';
import prisma from '../config/prisma';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firebaseUid: string;
        email: string;
        name: string | null;
        role: string;
        avatarUrl: string | null;
        phone: string | null;
      };
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Hardcoded Admin Bypass
    if (token === 'admin_hardcoded_token_123') {
      req.user = {
        id: 'admin-1',
        firebaseUid: 'admin-1',
        email: 'nikeshsammineni@gmail.com',
        name: 'System Admin',
        role: 'ADMIN',
        avatarUrl: null,
        phone: null
      };
      return next();
    }

    // Support mock phone tokens for Demo Mode
    if (token.startsWith('mock_id_token_')) {
      let mockUid = token.replace('mock_id_token_', '');
      if (!mockUid.startsWith('phone_')) {
        mockUid = `phone_${mockUid}`;
      }

      const user = await prisma.user.findUnique({
        where: { firebaseUid: mockUid },
        select: { id: true, firebaseUid: true, email: true, name: true, role: true, avatarUrl: true, phone: true },
      });

      if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found. Please call /api/auth/phone sync first.' });
      }

      req.user = { ...user, role: user.role as string };
      return next();
    }

    // Try Supabase Auth Token verification
    let decodedToken: any = null;
    let isSupabase = false;
    try {
      const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.getUser(token);
      if (sbUser && !sbError) {
        isSupabase = true;
        decodedToken = { uid: sbUser.id };
      }
    } catch (e) {
      // Ignore
    }

    if (!isSupabase) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          if (payload && (payload.sub || payload.user_id)) {
            isSupabase = true;
            decodedToken = { uid: payload.sub || payload.user_id };
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    if (!isSupabase) {
      try {
        decodedToken = await firebaseAuth.verifyIdToken(token);
      } catch (e) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid: decodedToken.uid },
      select: { id: true, firebaseUid: true, email: true, name: true, role: true, avatarUrl: true, phone: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found. Please call /api/auth/sync first.' });
    }

    req.user = { ...user, role: user.role as string };
    next();
  } catch (error: any) {
    console.error('[Auth Middleware] Error:', error.message);
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userRoleUpper = req.user.role?.toUpperCase();
    const allowedRolesUpper = roles.map(r => r.toUpperCase());
    if (!allowedRolesUpper.includes(userRoleUpper)) {
      return res.status(403).json({ error: `Forbidden: Requires one of [${roles.join(', ')}]` });
    }
    next();
  };
};
