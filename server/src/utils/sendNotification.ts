import webPush from "web-push";
import usersDbApi from "../database/users";
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
    userId: string,
    notification: NotificationModel,
) {
    const user = await usersDbApi.get(userId);

    if (!user?.sendNotifications) {
        return;
    }

    if (user.pushSubscription) {
        console.log(
            "sending notification to user:",
            user,
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
                endpoint: user.pushSubscription.endpoint!,
                keys: {
                    p256dh: user.pushSubscription.keys!.p256dh,
                    auth: user.pushSubscription.keys!.auth,
                },
            },
            JSON.stringify(pushNotification),
        );
    } else if (user.phoneNumber && user.isPhoneNumberValidated) {
        await sendSms(user.phoneNumber, notification.smsMessage);
    }
}

export default sendNotification;
