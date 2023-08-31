import { precacheAndRoute } from "workbox-precaching";
import { type PushNotificationModel } from "../../shared/models/NotificationModels";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

interface NotificationData {
    gameId: string;
}

self.addEventListener("push", function (event) {
    if (!event.data) {
        return;
    }

    const pushNotification = event.data.json() as PushNotificationModel;
    const notificationData: NotificationData = {
        gameId: pushNotification.gameId,
    };
    event.waitUntil(
        self.registration.showNotification(pushNotification.title, {
            body: pushNotification.message,
            data: notificationData,
            icon: "/pwa-192x192.png",
            badge: "/badge-128x128.png",
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const notificationData = event.notification.data as NotificationData;
    const gameId = notificationData.gameId;

    const urlToOpen = new URL(`/games/${gameId}`, self.location.origin).href;

    const promiseChain = self.clients
        .matchAll({
            type: "window",
            includeUncontrolled: true,
        })
        .then((windowClients) => {
            let matchingClient = null;

            for (const windowClient of windowClients) {
                if (windowClient.url === urlToOpen) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return self.clients.openWindow(urlToOpen);
            }
        });

    event.waitUntil(promiseChain);
});
