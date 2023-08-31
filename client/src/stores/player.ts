import { defineStore } from "pinia";
import {
    type PlayerUpdateModel,
    type PlayerModel,
    type PhoneValidationRequestModel,
    type PhoneValidationResponseModel,
} from "../../../shared/models/PlayerModels";

interface PlayerState {
    isPlayerFetched: boolean;
    player: PlayerModel | null;
}

const areNativeNotificationsSupported =
    "serviceWorker" in navigator && "PushManager" in window;

export const usePlayerStore = defineStore("player", {
    state: (): PlayerState => ({
        isPlayerFetched: false,
        player: null,
    }),
    getters: {
        playerNeedsInitialization(state): boolean {
            return Boolean(
                this.needsUsername ||
                    // this.needsPhoneNumber ||
                    // this.needsPhoneNumberValidation || // waiting for A2P Registration to complete https://jpc.pw/Xi9RM
                    (areNativeNotificationsSupported &&
                        state.player?.sendNotifications === null),
            );
        },
        needsUsername(state) {
            return state.isPlayerFetched && !state.player?.username;
        },
        needsToSetNotifications(state) {
            return (
                areNativeNotificationsSupported &&
                state.player?.sendNotifications === null
            );
        },
        needsPhoneNumber(state) {
            return Boolean(
                state.player?.sendNotifications &&
                    !areNativeNotificationsSupported &&
                    !state.player.phoneNumber,
            );
        },
        needsPhoneNumberValidation(state) {
            return Boolean(
                state.player?.sendNotifications &&
                    !areNativeNotificationsSupported &&
                    state.player.phoneNumber &&
                    !state.player.isPhoneNumberValidated,
            );
        },
    },
    actions: {
        async initPlayer(): Promise<void> {
            if (this.isPlayerFetched) {
                return;
            }
            const playerResponse = (await fetch("/api/players/me").then(
                (response) => response.json(),
            )) as PlayerModel;

            this.player = playerResponse;
            this.isPlayerFetched = true;
        },
        async updateUsername(username: string): Promise<void> {
            const playerUpdateBody: PlayerUpdateModel = {
                username,
            };
            await updatePlayer(playerUpdateBody);
        },
        async updatePhoneNumber(phoneNumber: string): Promise<void> {
            const playerUpdateBody: PlayerUpdateModel = {
                phoneNumber,
            };
            await updatePlayer(playerUpdateBody);
        },
        async verifyPhoneNumber(code: string): Promise<void> {
            const phoneValidationBody: PhoneValidationRequestModel = {
                code,
            };
            const response = (await fetch("/api/players/me/validate-phone", {
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(phoneValidationBody),
            }).then((response) =>
                response.json(),
            )) as PhoneValidationResponseModel;

            if (response.success) {
                alert("success!!");
                this.player = response.player;
            }
        },
        async setNotificationPreference(sendNotifications: boolean) {
            const playerUpdateBody: PlayerUpdateModel = {
                sendNotifications,
            };
            await updatePlayer(playerUpdateBody);

            if (sendNotifications) {
                if (areNativeNotificationsSupported) {
                    await turnOnNativeNotifications();
                } else if (this.player?.phoneNumber) {
                    await turnOnSmsNotifications();
                }
            }
        },
    },
});

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

async function turnOnNativeNotifications() {
    const result = await Notification.requestPermission();
    const sendNotifications = result === "granted";
    const playerUpdateBody: PlayerUpdateModel = {
        sendNotifications,
    };

    if (sendNotifications) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.subscribe({
            playerVisibleOnly: true,
            applicationServerKey:
                "BJSK-EtWwl9dvDnnEbTJo86a9LvOuvEgPSLUEtlKgF1_X-ZrG1omQUlglV7vnsbE6ZmcTuaDB_A6zbbrw5hOoZA",
        });

        if (subscription) {
            playerUpdateBody.pushSubscription = subscription.toJSON();
        }
    }

    await fetch("/api/players/me", {
        method: "put",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(playerUpdateBody),
    });
}

async function turnOnSmsNotifications() {
    const playerStore = usePlayerStore();
    if (!playerStore.player?.phoneNumber) {
    }
}
