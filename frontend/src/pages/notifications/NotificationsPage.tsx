import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Landmark,
  PiggyBank,
  CheckCheck,
  AlertCircle,
} from 'lucide-react';
import { notificationsApi } from '../../api';
import { Notification } from '../../types';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadFilter, setUnreadFilter] = useState(false);

  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await notificationsApi.list({ unread: unreadFilter || undefined, limit: 30 });
      setNotifications(res.data?.notifications || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadFilter]);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'LOAN_APPLICATION':
      case 'LOAN_APPROVED':
      case 'LOAN_REJECTED':
        return <Landmark size={18} className="text-blue-600" />;
      case 'SAVINGS_DEPOSIT':
      case 'SAVINGS_WITHDRAWAL':
        return <PiggyBank size={18} className="text-emerald-600" />;
      case 'MEETING':
        return <Clock size={18} className="text-amber-600" />;
      default:
        return <Bell size={18} className="text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1F3A]">Notification Center</h1>
          <p className="text-xs text-slate-500 mt-1">
            Personal updates, loan decisions, meeting reminders, and system notifications
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCheck size={16} />}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setUnreadFilter(false)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
            !unreadFilter
              ? 'bg-[#0B1F3A] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Notifications
        </button>
        <button
          onClick={() => setUnreadFilter(true)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            unreadFilter
              ? 'bg-[#0B1F3A] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notification List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <LoadingSpinner message="Loading notifications..." />
        ) : notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You are completely caught up! No notifications to display."
            icon={<Bell size={24} />}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className={`p-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                  n.isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-blue-50/30 hover:bg-blue-50/50'
                }`}
              >
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200 shrink-0 mt-0.5">
                  {getNotifIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-xs font-semibold truncate ${
                        n.isRead ? 'text-slate-700' : 'text-[#0B1F3A] font-bold'
                      }`}
                    >
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleDateString()}{' '}
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" title="Unread" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
