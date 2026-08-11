/**
 * useNotifications — Real-time notification hook
 *
 * Connects to the Socket.IO server after the user authenticates,
 * receives push notifications in real-time, and manages local state.
 *
 * Usage:
 *   const { notifications, unreadCount, markRead, markAllRead } = useNotifications(firebaseUser);
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../lib/apiClient';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

interface UseNotificationsReturn {
  notifications: AppNotification[];
  unreadCount: number;
  connected: boolean;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(user: { id: string } | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Fetch existing notifications from REST API on mount
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiClient.get('/api/notifications');
      setNotifications(data.notifications ?? []);
    } catch (err) {
      console.warn('[Notifications] Failed to fetch existing notifications:', err);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // Disconnect and clear state when user logs out
      socketRef.current?.disconnect();
      socketRef.current = null;
      setNotifications([]);
      setConnected(false);
      return;
    }

    let isMounted = true;

    const connect = async () => {
      try {
        await fetchNotifications();
        if (!isMounted) return;

        const socket = io('/', {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          if (isMounted) setConnected(true);
        });

        socket.on('disconnect', () => {
          if (isMounted) setConnected(false);
        });

        socket.on('notification', (notification: AppNotification) => {
          if (isMounted) {
            setNotifications((prev) => [notification, ...prev]);
          }
        });
      } catch (err) {
        console.error('[Notifications] Connection error:', err);
      }
    };

    connect();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (ids: string[]) => {
    if (!user) return;
    try {
      await apiClient.patch('/api/notifications/read', { ids });
      setNotifications((prev) =>
        prev.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('[Notifications] markRead failed:', err);
    }
  }, [user]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      await apiClient.patch('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('[Notifications] markAllRead failed:', err);
    }
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, connected, markRead, markAllRead };
}
