import { defineStore } from "pinia";
import {
    type UserUpdateModel,
    type UserModel,
    type PhoneValidationRequestModel,
    type PhoneValidationResponseModel,
} from "../../../shared/models/UserModels";

interface UserState {
    isUserFetched: boolean;
    user: UserModel | null;
}

const areNativeNotificationsSupported =
    "serviceWorker" in navigator && "PushManager" in window;

export const useUserStore = defineStore("user", {
    state: (): UserState => ({
        isUserFetched: false,
        user: null,
    }),
    getters: {
        userNeedsInitialization(state): boolean {
            return Boolean(
                this.needsUsername ||
                    // this.needsPhoneNumber ||
                    // this.needsPhoneNumberValidation || // waiting for A2P Registration to complete https://jpc.pw/Xi9RM
                    (areNativeNotificationsSupported &&
                        state.user?.sendNotifications === null),
            );
        },
        needsUsername(state) {
            return state.isUserFetched && !state.user?.username;
        },
        needsToSetNotifications(state) {
            return (
                areNativeNotificationsSupported &&
                state.user?.sendNotifications === null
            );
        },
        needsPhoneNumber(state) {
            return Boolean(
                state.user?.sendNotifications &&
                    !areNativeNotificationsSupported &&
                    !state.user.phoneNumber,
            );
        },
        needsPhoneNumberValidation(state) {
            return Boolean(
                state.user?.sendNotifications &&
                    !areNativeNotificationsSupported &&
                    state.user.phoneNumber &&
                    !state.user.isPhoneNumberValidated,
            );
        },
    },
    actions: {
        async initUser(): Promise<void> {
            if (this.isUserFetched) {
                return;
            }
            const userResponse = (await fetch("/api/users/me").then(
                (response) => response.json(),
            )) as UserModel;

            this.user = userResponse;
            this.isUserFetched = true;
        },
        async updateUsername(username: string): Promise<void> {
            const userUpdateBody: UserUpdateModel = {
                username,
            };
            await updateUser(userUpdateBody);
        },
        async updatePhoneNumber(phoneNumber: string): Promise<void> {
            const userUpdateBody: UserUpdateModel = {
                phoneNumber,
            };
            await updateUser(userUpdateBody);
        },
        async verifyPhoneNumber(code: string): Promise<void> {
            const phoneValidationBody: PhoneValidationRequestModel = {
                code,
            };
            const response = (await fetch("/api/users/me/validate-phone", {
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(phoneValidationBody),
            }).then((response) =>
                response.json(),
            )) as PhoneValidationResponseModel;

            if (response.success) {
                alert("success!!");
                this.user = response.user;
            }
        },
        async setNotificationPreference(sendNotifications: boolean) {
            const userUpdateBody: UserUpdateModel = {
                sendNotifications,
            };
            await updateUser(userUpdateBody);

            if (sendNotifications) {
                if (areNativeNotificationsSupported) {
                    await turnOnNativeNotifications();
                } else if (this.user?.phoneNumber) {
                    await turnOnSmsNotifications();
                }
            }
        },
    },
});

async function updateUser(params: UserUpdateModel) {
    const userStore = useUserStore();

    userStore.user = (await fetch("/api/users/me", {
        method: "put",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(params),
    }).then((response) => response.json())) as UserModel;
}

async function turnOnNativeNotifications() {
    const result = await Notification.requestPermission();
    const sendNotifications = result === "granted";
    const userUpdateBody: UserUpdateModel = {
        sendNotifications,
    };

    if (sendNotifications) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
                "BJSK-EtWwl9dvDnnEbTJo86a9LvOuvEgPSLUEtlKgF1_X-ZrG1omQUlglV7vnsbE6ZmcTuaDB_A6zbbrw5hOoZA",
        }); // {"endpoint":"https://web.push.apple.com/QCNk4SowYVOTYUhkXiJcl1QOc2YZGCaq6ELL9FDFn-yvxoYADzUTmmsjVwmEgQwU4gsl8zJT9lgCdkKYzTuHWilYR5c6aA-ejY_WW2NhUOPzHVBUAxvs1Zry54GQOHsy4ZmbDiFo-vZczBJugfBM6SLrAZXqGq0GzMp1txXQEeQ","keys":{"p256dh":"BMQbpIVqWrMCn3A5cRm3LPwmzv9XB4_SQA1_TPSKM3lu4iP-iFHnASTVYJgbmqMJcCUbTTli1nWmOCMA5fOa1kA","auth":"S-V3FcMNU0aA5B_j291V5A"}}

        if (subscription) {
            userUpdateBody.pushSubscription = subscription.toJSON();
        }
    }

    await fetch("/api/users/me", {
        method: "put",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(userUpdateBody),
    });
}

async function turnOnSmsNotifications() {
    const userStore = useUserStore();
    if (!userStore.user?.phoneNumber) {
    }
}

// sourced from https://gist.github.com/Klerith/80abd742d726dd587f4bd5d6a0ab26b6
function urlBase64ToUint8Array(base64String: string) {
    var padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    var base64 = (base64String + padding)
        .replace(/\-/g, "+")
        .replace(/_/g, "/");

    var rawData = window.atob(base64);
    var outputArray = new Uint8Array(rawData.length);

    for (var i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
