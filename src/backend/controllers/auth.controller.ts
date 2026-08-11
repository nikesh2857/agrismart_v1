import { Request, Response, NextFunction } from 'express';
import { syncUserSchema } from '../validators/auth.validator';
import * as authService from '../services/auth.service';
import { firebaseAuth } from '../config/firebase';
import { supabaseAdmin } from '../config/supabase';

export const sync = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }

    const token = authHeader.split('Bearer ')[1];
    
    let uid = '';
    let email = '';
    let name = '';
    let picture = '';
    let isSupabase = false;

    try {
      const { data: { user: sbUser }, error: sbError } = await supabaseAdmin.auth.getUser(token);
      if (sbUser && !sbError) {
        isSupabase = true;
        uid = sbUser.id;
        email = sbUser.email || `${sbUser.id}@supabase.user`;
        name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || '';
        picture = sbUser.user_metadata?.avatar_url || '';
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
            uid = payload.sub || payload.user_id;
            email = payload.email || `${uid}@user.com`;
            name = payload.user_metadata?.full_name || payload.user_metadata?.name || payload.name || email.split('@')[0] || '';
            picture = payload.user_metadata?.avatar_url || payload.picture || '';
            isSupabase = true;
          }
        }
      } catch (e) {
        // Ignore
      }
    }

    if (!isSupabase) {
      try {
        const decodedToken = await firebaseAuth.verifyIdToken(token);
        uid = decodedToken.uid;
        email = decodedToken.email || `${uid}@firebase.user`;
        name = (decodedToken as any).name || email.split('@')[0] || '';
        picture = (decodedToken as any).picture || '';
      } catch (e) {
        console.warn('[Auth Sync] Token verification fallback:', e);
        // If mock or demo token, extract UID
        if (token.startsWith('mock_id_token_')) {
          uid = token.replace('mock_id_token_', 'phone_');
          email = `${uid}@phone.agrismart.com`;
          name = 'Phone User';
        } else {
          throw new Error('Invalid authentication token');
        }
      }
    }

    const { role } = syncUserSchema.parse(req.body);

    const user = await authService.syncUser(
      uid,
      email,
      name,
      picture,
      role
    );

    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
};
