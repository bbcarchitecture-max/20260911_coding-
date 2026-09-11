import React, { useState, useEffect } from 'react';
import {
  X, Bell, Check, AtSign, UserCheck, FileCheck2, ShieldCheck,
  CheckCheck
} from 'lucide-react';
import { NotificationItem } from '../types';
import { apiService, subscribeToChanges } from '../services/apiService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTask: (taskId: string) => void;
  onOpenRfi: (rfiId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onOpenTask,
  onOpenRfi
}) => {
  const currentUser = apiService.getCurrentUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>(apiService.getNotifications(currentUser.id));

  useEffect(() => {
    const unsub = subscribeToChanges(() => {
      setNotifications(apiService.getNotifications(apiService.getCurrentUser().id));
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleItemClick = (item: NotificationItem) => {
    apiService.markNotificationAsRead(item.id);
    if (item.linkType === 'TASK' && item.linkId) {
      onOpenTask(item.linkId);
      onClose();
    } else if (item.linkType === 'RFI' && item.linkId) {
      onOpenRfi(item.linkId);
      onClose();
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'MENTION':
        return <AtSign className="w-3.5 h-3.5 text-black" strokeWidth={2} />;
      case 'ASSIGN':
        return <UserCheck className="w-3.5 h-3.5 text-black" strokeWidth={2} />;
      case 'RFI_ANSWER':
        return <FileCheck2 className="w-3.5 h-3.5 text-black" strokeWidth={2} />;
      case 'RFI_SIGN':
        return <ShieldCheck className="w-3.5 h-3.5 text-black" strokeWidth={2} />;
      default:
        return <Bell className="w-3.5 h-3.5 text-black" strokeWidth={2} />;
    }
  };

  return (
    <div
      id="notification-drawer-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex justify-end"
      onClick={onClose}
    >
      <div
        id="notification-drawer-container"
        className="w-full max-w-sm sm:max-w-md bg-white h-full flex flex-col border-l-2 border-black"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-black flex items-center justify-between bg-neutral-100">
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 text-black" strokeWidth={2} />
            <span className="font-display font-bold text-black text-sm uppercase tracking-tight">
              ACTIVITY DISPATCH
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-black text-white">
                {unreadCount} UNREAD
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => apiService.markAllNotificationsAsRead(currentUser.id)}
                className="text-[10px] font-mono uppercase font-bold text-black hover:underline flex items-center space-x-1"
                title="Mark all read"
              >
                <CheckCheck className="w-3.5 h-3.5" strokeWidth={2} />
                <span>MARK READ</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 border border-black hover:bg-black hover:text-white transition-colors duration-100"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto divide-y divide-black/10">
          {notifications.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 font-mono text-xs uppercase">
              NO DISPATCH LOGS
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 hover:bg-neutral-100 cursor-pointer transition-colors duration-100 flex items-start space-x-3 group ${
                  !item.read ? 'bg-white font-semibold' : 'bg-neutral-50/50 opacity-75'
                }`}
              >
                <div className="w-7 h-7 border border-black bg-white flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-black group-hover:text-white transition-colors duration-100">
                  {getNotificationIcon(item.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mb-0.5">
                    <span className="uppercase">{item.type}</span>
                    <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h4 className="font-serif font-bold text-xs text-black group-hover:underline line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="font-serif text-xs text-neutral-600 mt-1 line-clamp-2">
                    {item.content}
                  </p>
                </div>

                {!item.read && (
                  <span className="w-2 h-2 bg-black shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t-2 border-black bg-neutral-100 text-[10px] font-mono text-neutral-500 flex items-center justify-between uppercase">
          <span>EVENT BUS: ACTIVE</span>
          <span>WEBSOCKET STATUS: CONNECTED</span>
        </div>
      </div>
    </div>
  );
};
