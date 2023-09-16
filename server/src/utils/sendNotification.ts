import webPush from "web-push";
import playersDbApi from "../database/players";
import { type PushNotificationModel } from "../../../shared/models/NotificationModels";
import sendSms from "./sendSms";

export interface NotificationModel {
    url: string | null;
    pushTitle: string;
    pushMessage: string;
    smsMessage: string | null;
}

webPush.setVapidDetails(
    "mailto:john@castberg.media",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
);

async function sendNotification(
    playerId: string,
    notification: NotificationModel,
) {
    const player = await playersDbApi.get({ playerId });

    if (!player) {
        return;
    }

    const pushNotification: PushNotificationModel = {
        playerId,
        url: notification.url,
        title: notification.pushTitle,
        message: notification.pushMessage,
    };

    for (const pushSubscription of player.pushSubscriptions) {
        if (!pushSubscription.isActive) {
            continue;
        }

        await webPush.sendNotification(
            {
                endpoint: pushSubscription.subscription.endpoint!,
                keys: {
                    p256dh: pushSubscription.subscription.keys!.p256dh,
                    auth: pushSubscription.subscription.keys!.auth,
                },
            },
            JSON.stringify(pushNotification),
        );
    }

    if (
        player.phoneNumber &&
        player.sendSmsNotifications &&
        notification.smsMessage
    ) {
        await sendSms(player.phoneNumber, notification.smsMessage);
    }
}

export default sendNotification;
