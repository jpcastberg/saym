import webPush from "web-push";
import playersDbApi from "../database/players";
import { type PushNotificationModel } from "../../../shared/models/NotificationModels";
import sendSms from "./sendSms";

export interface NotificationModel {
    gameId: string;
    pushTitle: string;
    pushMessage: string;
    smsMessage: string;
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
    const player = await playersDbApi.get(playerId);

    if (!player?.sendNotifications) {
        return;
    }

    if (player.pushSubscription) {
        console.log(
            "sending notification to player:",
            player,
            "message:",
            notification,
        );
        const pushNotification: PushNotificationModel = {
            gameId: notification.gameId,
            title: notification.pushTitle,
            message: notification.pushMessage,
        };
        await webPush.sendNotification(
            {
                endpoint: player.pushSubscription.endpoint!,
                keys: {
                    p256dh: player.pushSubscription.keys!.p256dh,
                    auth: player.pushSubscription.keys!.auth,
                },
            },
            JSON.stringify(pushNotification),
        );
    } else if (player.phoneNumber && player.isPhoneNumberValidated) {
        await sendSms(player.phoneNumber, notification.smsMessage);
    }
}

export default sendNotification;
