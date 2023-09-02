export const botName = "Saymbot";

export interface PublicPlayerModel {
    _id: string;
    username: string | null;
    sendNotifications: boolean | null;
}

export interface PlayerModel extends PublicPlayerModel {
    phoneNumber: string | null;
    isPhoneNumberValidated: boolean;
    pushSubscription: PushSubscriptionJSON | null;
}

export interface PlayerUpdateModel {
    username?: string;
    sendNotifications?: boolean;
    phoneNumber?: string;
    pushSubscription?: PushSubscriptionJSON;
}

export interface PhoneValidationRequestModel {
    code: string;
}

export interface PhoneValidationResponseModel {
    success: boolean;
    player: PlayerModel | null;
}
