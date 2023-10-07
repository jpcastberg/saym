export interface PushNotificationModel {
    playerId: string;
    token: string | null;
    url: string | null;
    title: string;
    message: string;
}
