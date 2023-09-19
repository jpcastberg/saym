import webPush from "web-push";
import playersDbApi from "../database/players";
import { type PushNotificationModel } from "../../../shared/models/NotificationModels";
import { serverLogger } from "./logger";

webPush.setVapidDetails(
    "mailto:john@castberg.media",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

async function sendNotification(notification: PushNotificationModel) {
    const player = await playersDbApi.get({ playerId: notification.playerId });

    if (!player) {
        return;
    }

    serverLogger.debug("attempting_to_send_notification", {
        notification,
    });

    for (const pushSubscription of player.pushSubscriptions) {
        if (!pushSubscription.isActive) {
            continue;
        }

        await webPush
            .sendNotification(
                {
                    endpoint: pushSubscription.subscription.endpoint!,
                    keys: {
                        p256dh: pushSubscription.subscription.keys!.p256dh,
                        auth: pushSubscription.subscription.keys!.auth,
                    },
                },
                JSON.stringify(notification),
            )
            .catch((error) => {
                serverLogger.error("notification_sending_failed", error);
            });
    }
}

export default sendNotification;
