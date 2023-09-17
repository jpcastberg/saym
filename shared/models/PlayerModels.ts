export const botName = "Saymbot";

export interface PublicPlayerModel {
    _id: string;
    username: string | null;
}

export interface PlayerModel extends PublicPlayerModel {
    phoneNumber: string | null;
    shouldCollectPhoneNumber: boolean;
    pushSubscriptions: PushSubscriptionModel[];
}

export interface PlayerUpdateModel {
    username?: string;
    shouldCollectPhoneNumber?: boolean;
}

export interface PushSubscriptionModel {
    _id: string;
    isActive: boolean;
    subscription: PushSubscriptionJSON;
}

export interface PushSubscriptionUpdateModel {
    isActive: boolean;
}

export interface RequestPhoneVerificationModel {
    phoneNumber: string;
}

export interface VerifyPhoneRequestModel {
    code: string;
}

export interface VerifyPhoneResponseModel {
    success: boolean;
    didMerge: boolean;
    player: PlayerModel | null;
}
