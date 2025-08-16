'use client';

import { useState, useEffect } from 'react';
import { Bell, Dot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NotificationCenter } from './notification-center';
import { useSocket } from '@/hooks/use-socket';

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isConnected, on } = useSocket({
    autoConnect: true,
    auth: { userId, teamId: '' } // Will be updated when user joins a team
  });

  // Fetch initial unread count
  useEffect(() => {
    fetchUnreadCount();
  }, [userId]);

  // Set up WebSocket listeners for real-time notifications
  useEffect(() => {
    if (isConnected) {
      on('new-notification', (notification) => {
        if (notification.userId === userId) {
          setUnreadCount(prev => prev + 1);
          // Show browser notification if permitted
          showBrowserNotification(notification);
        }
      });

      on('notification-read', ({ notificationId }) => {
        setUnreadCount(prev => Math.max(0, prev - 1));
      });

      on('all-notifications-read', () => {
        setUnreadCount(0);
      });

      on('notification-deleted', ({ notificationId }) => {
        setUnreadCount(prev => Math.max(0, prev - 1));
      });
    }
  }, [isConnected, on, userId]);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const showBrowserNotification = (notification: any) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        new Notification('').close();
      }, 5000);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('Notification permission:', permission);
    }
  };

  const toggleNotificationCenter = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Mark all as read when opening (optional behavior)
      // markAllAsRead();
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleNotificationCenter}
          className="relative h-9 w-9 p-0"
          onMouseEnter={requestNotificationPermission}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <>
              {unreadCount <= 9 ? (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {unreadCount}
                </Badge>
              ) : (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  9+
                </Badge>
              )}
            </>
          )}
        </Button>
        
        {/* Pulsing animation for new notifications */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 rounded-md animate-pulse bg-primary/10 pointer-events-none" />
        )}
      </div>

      <NotificationCenter
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userId={userId}
      />
    </>
  );
}