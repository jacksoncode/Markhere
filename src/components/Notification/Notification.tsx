import { create } from 'zustand';
import { useCallback } from 'react';
import './Notification.css';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration: number;
}

interface NotificationState {
  notifications: NotificationItem[];
  notify: (type: NotificationType, message: string, title?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

let notificationCounter = 0;

export const useNotificationStore = create<NotificationState>()((set) => ({
  notifications: [],
  notify: (type, message, title, duration = 5000) => {
    const id = `notification-${++notificationCounter}-${Date.now()}`;
    const item: NotificationItem = { id, type, message, title, duration };
    set((state) => ({ notifications: [...state.notifications, item] }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }

    return id;
  },
  dismiss: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },
  clearAll: () => set({ notifications: [] }),
}));

function Toast({ notification }: { notification: NotificationItem }) {
  const dismiss = useNotificationStore((s) => s.dismiss);
  const { id, type, message, title, duration } = notification;

  const handleDismiss = useCallback(() => dismiss(id), [dismiss, id]);

  // Manual dismiss for sticky notifications (duration=0)
  // Auto-dismiss is handled by the timeout in the store's notify function
  const isSticky = duration === 0;

  return (
    <div
      className={`notification-toast notification-toast--${type}`}
      role="alert"
      data-sticky={isSticky}
    >
      <div className="notification-toast__content">
        {title && <div className="notification-toast__title">{title}</div>}
        <div className="notification-toast__message">{message}</div>
      </div>
      <button
        className="notification-toast__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
        type="button"
      >
        &times;
      </button>
    </div>
  );
}

export function NotificationContainer() {
  const notifications = useNotificationStore((s) => s.notifications);

  return (
    <div className="notification-container" aria-live="polite">
      {notifications.map((notification) => (
        <Toast key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
