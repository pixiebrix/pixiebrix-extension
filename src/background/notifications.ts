import { liftBackground } from "@/background/protocol";

export const createNotification = liftBackground(
  "CREATE_NOTIFICATION",
  async (options: chrome.notifications.NotificationOptions) => {
    return await new Promise((resolve, reject) => {
      chrome.notifications.create(
        undefined, // generate id automatically
        options,
        (notificationId) => {
          if (chrome.runtime.lastError != null) {
            reject(chrome.runtime.lastError.message);
          }
          resolve(notificationId);
        }
      );
    });
  }
);
