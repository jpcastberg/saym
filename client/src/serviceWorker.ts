import { precacheAndRoute } from "workbox-precaching";
import { type PushNotificationModel } from "../../shared/models/NotificationModels";
import { type PlayerModel } from "../../shared/models/PlayerModels";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

interface NotificationData {
    url: string | null;
}

self.addEventListener("push", function (event) {
    if (!event.data) {
        return;
    }

    const pushNotification = event.data.json() as PushNotificationModel;

    const notificationData: NotificationData = {
        url: pushNotification.url,
    };

    const promiseChain = fetch("/api/players/me")
        .then((response) => response.json())
        .then((currentPlayer: PlayerModel) => {
            if (pushNotification.playerId !== currentPlayer._id) {
                return;
            }

            return self.registration.showNotification(pushNotification.title, {
                body: pushNotification.message,
                data: notificationData,
                icon: "/pwa-192x192.png",
                badge: "/badge-128x128.png",
            });
        });

    event.waitUntil(promiseChain);
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const notificationData = event.notification.data as NotificationData;
    const url = notificationData.url;

    const promiseChain = self.clients
        .matchAll({
            type: "window",
            includeUncontrolled: true,
        })
        .then((windowClients) => {
            if (url) {
                return self.clients.openWindow(url);
            } else if (windowClients[0]) {
                // most recently focused window
                return windowClients[0].focus();
            }

            return self.clients.openWindow("/");
        });

    event.waitUntil(promiseChain);
});
