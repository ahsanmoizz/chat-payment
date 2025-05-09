// notificationsManager.js

// Request permission to display notifications
export const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'unsupported';
  };
  
  // Display a notification with a title and options (like body, icon, etc.)
  export const showNotification = (title, options = {}) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  };
  