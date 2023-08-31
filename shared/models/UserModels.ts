export interface PublicUserModel {
    _id: string;
    username: string | null;
    sendNotifications: boolean | null;
}

export interface UserModel extends PublicUserModel {
    phoneNumber: string | null;
    isPhoneNumberValidated: boolean;
    pushSubscription: PushSubscriptionJSON | null;
}

export interface UserUpdateModel {
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
    user: UserModel | null;
}
