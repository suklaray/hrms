import { X, Clock, MessageSquare } from "lucide-react";
import { useRouter } from "next/router";

export default function NotificationSidebar({ isOpen, onClose, notifications, onNotificationClick }) {
  const router = useRouter();

  const handleNotificationClick = (notification) => {
    onNotificationClick(notification.id);
    router.push(notification.link);
    onClose();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
          <div className="absolute right-0 top-0 h-full w-80 bg-gray-100 shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto h-full pb-16">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No new notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="p-4 border-b border-gray-200 hover:bg-white cursor-pointer transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {notification.type === 'attendance' ? (
                          <Clock className="w-5 h-5 text-blue-500" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {!notification.viewed && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}