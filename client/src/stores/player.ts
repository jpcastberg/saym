import { defineStore } from "pinia";
import {
    type PlayerUpdateModel,
    type PlayerModel,
    type VerifyPhoneRequestModel,
    type VerifyPhoneResponseModel,
    type RequestPhoneVerificationModel,
    type PushSubscriptionModel,
    type PushSubscriptionUpdateModel,
} from "../../../shared/models/PlayerModels";
import { useAppStore } from "./app";

interface PlayerState {
    isPlayerFetched: boolean;
    player: PlayerModel | null;
}

export const usePlayerStore = defineStore("player", {
    state: (): PlayerState => ({
        isPlayerFetched: false,
        player: null,
    }),
    getters: {
        areNativeNotificationsOn(state) {
            const appStore = useAppStore();
            const pushSubscriptionId = appStore.pushSubscriptionId;

            const foundPushSubscription = state.player?.pushSubscriptions.find(
                (subscription) => subscription._id === pushSubscriptionId,
            );

            if (foundPushSubscription) {
                return foundPushSubscription.isActive;
            }

            return false;
        },
    },
    actions: {
        initPlayer,
        updateUsername,
        requestPhoneVerification,
        verifyPhone,
        setPhoneNumberCollectPreference,
        turnOnPushNotifications,
        turnOffPushNotifications,
        logout,
    },
});

async function initPlayer(): Promise<void> {
    const playerStore = usePlayerStore();
    const playerResponse = await fetch("/api/players/me");

    const player = (await playerResponse.json()) as PlayerModel;
    playerStore.player = player;

    playerStore.isPlayerFetched = true;
}

async function updateUsername(username: string): Promise<void> {
    const playerStore = usePlayerStore();
    if (username === playerStore.player?.username) {
        return;
    }

    const playerUpdateBody: PlayerUpdateModel = {
        username,
    };
    await updatePlayer(playerUpdateBody);
}

async function requestPhoneVerification(phoneNumber: string): Promise<void> {
    const phoneVerificationRequestBody: RequestPhoneVerificationModel = {
        phoneNumber,
    };
    await fetch("/api/players/me/request-phone-verification", {
        method: "post",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(phoneVerificationRequestBody),
    });
}

async function verifyPhone(code: string): Promise<VerifyPhoneResponseModel> {
    const playerStore = usePlayerStore();
    const phoneValidationBody: VerifyPhoneRequestModel = {
        code,
    };
    const response = (await fetch("/api/players/me/verify-phone", {
        method: "post",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(phoneValidationBody),
    }).then((response) => response.json())) as VerifyPhoneResponseModel;

    if (response.success) {
        if (response.didMerge) {
            await useAppStore().initApp();
        } else {
            playerStore.player = response.player;
        }
    }

    return response;
}

async function setPhoneNumberCollectPreference(
    shouldCollectPhoneNumber: boolean,
) {
    const playerUpdateBody: PlayerUpdateModel = {
        shouldCollectPhoneNumber,
    };

    await updatePlayer(playerUpdateBody);
}

async function turnOnPushNotifications() {
    const result = await Notification.requestPermission();
    const sendNotifications = result === "granted";
    if (!sendNotifications) {
        return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
            "BJSK-EtWwl9dvDnnEbTJo86a9LvOuvEgPSLUEtlKgF1_X-ZrG1omQUlglV7vnsbE6ZmcTuaDB_A6zbbrw5hOoZA",
    });

    if (!subscription) {
        return;
    }

    const subscriptionResponse = (await fetch(
        "/api/players/me/push-subscriptions",
        {
            method: "post",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(subscription),
        },
    ).then((response) => response.json())) as PushSubscriptionModel;

    localStorage.setItem("pushSubscriptionId", subscriptionResponse._id);

    await useAppStore().initPushSubscription();
    await usePlayerStore().initPlayer();
}

async function turnOffPushNotifications() {
    const appStore = useAppStore();
    const pushSubscriptionId = appStore.pushSubscriptionId;

    if (!pushSubscriptionId) {
        return;
    }

    const pushSubscriptionUpdateBody: PushSubscriptionUpdateModel = {
        isActive: false,
    };

    await fetch(`/api/players/me/push-subscriptions/${pushSubscriptionId}`, {
        method: "put",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(pushSubscriptionUpdateBody),
    }).then((response) => response.json());

    await usePlayerStore().initPlayer();
}

async function logout() {
    const appStore = useAppStore();
    await fetch("/api/players/me/logout", {
        method: "post",
    });

    await appStore.initApp();
}

async function updatePlayer(params: PlayerUpdateModel) {
    const playerStore = usePlayerStore();

    playerStore.player = (await fetch("/api/players/me", {
        method: "put",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(params),
    }).then((response) => response.json())) as PlayerModel;
}
