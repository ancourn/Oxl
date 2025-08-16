import { db } from './db';
import { UserRole, NotificationType } from '@prisma/client';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  teamId?: string;
  isRead?: boolean;
}

export class NotificationService {
  // Create a new notification
  static async create(data: NotificationData) {
    try {
      const notification = await db.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: data.metadata || {},
          teamId: data.teamId,
          isRead: data.isRead || false,
        }
      });

      // Send real-time notification via WebSocket
      if (global.io) {
        global.io.to(`notifications-${data.userId}`).emit('new-notification', notification);
      }

      // Send push notification if enabled
      await this.sendPushNotification(notification);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get user notifications with pagination
  static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    try {
      const skip = (page - 1) * limit;
      const where: any = { userId };

      if (unreadOnly) {
        where.isRead = false;
      }

      const [notifications, total] = await Promise.all([
        db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            team: {
              select: { id: true, name: true }
            }
          }
        }),
        db.notification.count({ where })
      ]);

      return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string) {
    try {
      const notification = await db.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: { isRead: true }
      });

      // Notify via WebSocket
      if (global.io) {
        global.io.to(`notifications-${userId}`).emit('notification-read', { notificationId });
      }

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string) {
    try {
      const result = await db.notification.updateMany({
        where: {
          userId,
          isRead: false
        },
        data: { isRead: true }
      });

      // Notify via WebSocket
      if (global.io) {
        global.io.to(`notifications-${userId}`).emit('all-notifications-read');
      }

      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  static async deleteNotification(notificationId: string, userId: string) {
    try {
      const notification = await db.notification.deleteMany({
        where: {
          id: notificationId,
          userId
        }
      });

      // Notify via WebSocket
      if (global.io) {
        global.io.to(`notifications-${userId}`).emit('notification-deleted', { notificationId });
      }

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Get unread count
  static async getUnreadCount(userId: string) {
    try {
      const count = await db.notification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

  // Send push notification
  private static async sendPushNotification(notification: any) {
    try {
      // Check if user has push notifications enabled
      const user = await db.user.findUnique({
        where: { id: notification.userId },
        select: { pushToken: true, notificationSettings: true }
      });

      if (!user?.pushToken || !user.notificationSettings?.pushEnabled) {
        return;
      }

      // Send push notification using service like Firebase Cloud Messaging
      // This is a placeholder implementation
      if (process.env.FCM_SERVER_KEY && process.env.FCM_SENDER_ID) {
        await this.sendFCMNotification(user.pushToken, notification);
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  // Send FCM notification
  private static async sendFCMNotification(token: string, notification: any) {
    // This would integrate with Firebase Cloud Messaging
    // For now, it's a placeholder implementation
    console.log('Sending FCM notification to token:', token, 'Notification:', notification);
  }

  // Create notification for team invite
  static async createTeamInviteNotification(
    inviterId: string,
    invitedUserId: string,
    teamId: string,
    teamName: string,
    role: UserRole
  ) {
    return this.create({
      userId: invitedUserId,
      type: NotificationType.TEAM_INVITE,
      title: 'Team Invitation',
      message: `You have been invited to join ${teamName} as a ${role.toLowerCase()}`,
      metadata: {
        inviterId,
        teamId,
        role
      },
      teamId
    });
  }

  // Create notification for mail received
  static async createMailReceivedNotification(
    recipientId: string,
    senderId: string,
    mailId: string,
    subject: string,
    teamId: string
  ) {
    return this.create({
      userId: recipientId,
      type: NotificationType.MAIL_RECEIVED,
      title: 'New Mail',
      message: `You have received a new email: ${subject}`,
      metadata: {
        senderId,
        mailId,
        teamId
      },
      teamId
    });
  }

  // Create notification for meeting starting
  static async createMeetingStartingNotification(
    userId: string,
    meetingId: string,
    meetingTitle: string,
    teamId: string,
    startTime: Date
  ) {
    return this.create({
      userId,
      type: NotificationType.MEETING_STARTING,
      title: 'Meeting Starting Soon',
      message: `Meeting "${meetingTitle}" starts at ${startTime.toLocaleTimeString()}`,
      metadata: {
        meetingId,
        teamId,
        startTime: startTime.toISOString()
      },
      teamId
    });
  }

  // Create notification for storage limit warning
  static async createStorageLimitNotification(
    userId: string,
    teamId: string,
    currentUsage: number,
    limit: number
  ) {
    const percentage = Math.round((currentUsage / limit) * 100);
    return this.create({
      userId,
      type: NotificationType.STORAGE_WARNING,
      title: 'Storage Limit Warning',
      message: `Your team is using ${percentage}% of available storage (${this.formatBytes(currentUsage)} of ${this.formatBytes(limit)})`,
      metadata: {
        teamId,
        currentUsage,
        limit,
        percentage
      },
      teamId
    });
  }

  // Create notification for billing events
  static async createBillingNotification(
    userId: string,
    teamId: string,
    type: 'payment_success' | 'payment_failed' | 'subscription_changed',
    message: string
  ) {
    return this.create({
      userId,
      type: NotificationType.BILLING,
      title: 'Billing Update',
      message,
      metadata: {
        teamId,
        billingEventType: type
      },
      teamId
    });
  }

  // Format bytes helper
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cleanup old notifications
  static async cleanupOldNotifications(daysOld: number = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await db.notification.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          },
          isRead: true
        }
      });

      console.log(`Cleaned up ${result.count} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}