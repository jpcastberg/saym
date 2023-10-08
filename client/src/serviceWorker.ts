import { precacheAndRoute } from "workbox-precaching";
import { type PushNotificationModel } from "../../shared/models/NotificationModels";
import { type PlayerModel } from "../../shared/models/PlayerModels";
import { type LogRequestBody } from "../../shared/models/ApiModels";

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

const logger = {
    debug(message: string, data: object | null) {
        log("debug", message, data);
    },
};

function log(level: "debug", message: string, data: object | null) {
    const reqBody: LogRequestBody = {
        level,
        message,
        data: {
            source: "serviceWorker",
            ...data,
        },
    };

    void self.fetch("/api/logs", {
        method: "post",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(reqBody),
    });
}

self.addEventListener("push", function (event) {
    if (!event.data) {
        return;
    }

    const pushNotification = event.data.json() as PushNotificationModel;

    logger.debug("push_notification_received", pushNotification);

    const promiseChain = fetch("/api/players/me")
        .then((response) => response.json())
        .then((currentPlayer: PlayerModel) => {
            if (pushNotification.playerId !== currentPlayer._id) {
                logger.debug("push_notification_rejected", {
                    currentPlayer,
                    pushNotification,
                });
                return;
            }

            logger.debug("notification_displayed", pushNotification);
            return self.registration.showNotification(pushNotification.title, {
                body: pushNotification.message,
                data: pushNotification,
                icon: "/favicon-196.png",
                badge: "/badge-128.png",
            });
        });

    event.waitUntil(promiseChain);
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const pushNotification = event.notification.data as PushNotificationModel;
    const url = pushNotification.url;

    logger.debug("notification_clicked", {
        pushNotification,
    });

    const promiseChain = self.clients
        .matchAll({
            type: "window",
            includeUncontrolled: true,
        })
        .then((windowClients) => {
            const builtUrl = new URL(url ?? "/", self.location.origin);
            builtUrl.pathname = builtUrl.pathname.replace(/\/+$/, "");

            for (const client of windowClients) {
                const builtClientUrl = new URL(client.url);
                builtClientUrl.pathname = builtClientUrl.pathname.replace(
                    /\/+$/,
                    "",
                );
                if (builtUrl.pathname === builtClientUrl.pathname) {
                    logger.debug(
                        "existing_window_opened_from_notification",
                        pushNotification,
                    );
                    return client.focus();
                }
            }

            if (windowClients[0]) {
                // most recently focused window
                logger.debug(
                    "existing_window_navigated_to_notification_url",
                    pushNotification,
                );
                return windowClients[0].navigate(builtUrl);
            }

            logger.debug(
                "new_window_opened_from_notification",
                pushNotification,
            );

            if (pushNotification.token) {
                builtUrl.search = `token=${pushNotification.token}`;
            }

            return self.clients.openWindow(builtUrl);
        });

    event.waitUntil(promiseChain);
});

self.addEventListener("install", async () => {
    await self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});
