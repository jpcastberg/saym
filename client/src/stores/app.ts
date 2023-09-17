import { defineStore } from "pinia";
import { type Component } from "vue";
import AboutDialog from "../components/AboutDialog.vue";
import RulesDialog from "../components/RulesDialog.vue";
import InvitePlayerDialog from "../components/InvitePlayerDialog.vue";
import PhoneNumberDialog from "../components/PhoneNumberDialog.vue";
import UsernameDialog from "../components/UsernameDialog.vue";
import NotificationsDialog from "../components/NotificationsDialog.vue";
import GameNotFoundDialog from "../components/GameNotFoundDialog.vue";
import calculatePushSubscriptionId from "../../../shared/utils/calculatePushSubscriptionId";
import { usePlayerStore } from "./player";
import { useGamesStore } from "./games";

interface AppState {
    shouldShowAppDrawer: boolean;
    shouldShowRulesDialog: boolean;
    shouldShowAboutDialog: boolean;
    pushSubscription: PushSubscriptionJSON | null;
    playerTriggeredUsernameChange: boolean;
    playerTriggeredPhoneNumberChange: boolean;
    playerClosedNotificationsDialog: boolean;
}

export const useAppStore = defineStore("app", {
    state: (): AppState => ({
        shouldShowAppDrawer: false,
        shouldShowRulesDialog: false,
        shouldShowAboutDialog: false,
        pushSubscription: null,
        playerTriggeredUsernameChange: false,
        playerTriggeredPhoneNumberChange: false,
        playerClosedNotificationsDialog: false,
    }),
    getters: {
        shouldShowDialog(): boolean {
            return Boolean(this.getActiveDialog);
        },
        getActiveDialog(state): Component | null {
            const gamesStore = useGamesStore();
            let dialog: Component | null = null;

            if (this.shouldPromptForPhoneNumber) {
                dialog = PhoneNumberDialog as Component;
            } else if (this.shouldPromptForUsername) {
                dialog = UsernameDialog as Component;
            } else if (this.shouldPromptToSetNotifications) {
                dialog = NotificationsDialog as Component;
            } else if (state.shouldShowRulesDialog) {
                dialog = RulesDialog as Component;
            } else if (state.shouldShowAboutDialog) {
                dialog = AboutDialog as Component;
            } else if (gamesStore.activeGame?.needToInvitePlayer) {
                dialog = InvitePlayerDialog as Component;
            } else if (gamesStore.activeGameNotFound) {
                dialog = GameNotFoundDialog as Component;
            }

            return dialog;
        },
        shouldPromptForPhoneNumber(state): boolean {
            const playerStore = usePlayerStore();
            return (
                playerStore.isPlayerFetched &&
                // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                (playerStore.player?.shouldCollectPhoneNumber ||
                    state.playerTriggeredPhoneNumberChange)
            );
        },
        shouldPromptForUsername(state): boolean {
            const playerStore = usePlayerStore();
            return (
                playerStore.isPlayerFetched &&
                (!playerStore.player?.username ||
                    state.playerTriggeredUsernameChange)
            );
        },
        shouldPromptToSetNotifications(state): boolean {
            const playerStore = usePlayerStore();
            const wasPromptedToEnableNotifications =
                localStorage.getItem(
                    `wasPromptedToEnableNotifications:${playerStore.player?._id}`,
                ) === "true";

            if (
                this.areNativeNotificationsSupported &&
                !wasPromptedToEnableNotifications &&
                !state.playerClosedNotificationsDialog
            ) {
                return !playerStore.areNativeNotificationsOn;
            }

            return false;
        },
        areNativeNotificationsSupported() {
            return "serviceWorker" in navigator && "PushManager" in window;
        },
        pushSubscriptionId(state) {
            const savedPushSubscriptionId =
                localStorage.getItem("pushSubscriptionId");

            if (savedPushSubscriptionId) {
                return savedPushSubscriptionId;
            } else if (state.pushSubscription) {
                return calculatePushSubscriptionId(state.pushSubscription);
            }

            return null;
        },
    },
    actions: {
        async initApp() {
            await usePlayerStore().initPlayer();
            await useGamesStore().initGames();
            await this.initPushSubscription();
        },
        async initPushSubscription() {
            if (!("serviceWorker" in navigator)) {
                return;
            }

            const registration =
                await navigator.serviceWorker.getRegistration();
            const pushSubscription =
                await registration?.pushManager.getSubscription();
            if (pushSubscription) {
                this.pushSubscription = pushSubscription.toJSON();
            }
        },
        logWasPromptedToEnableNotifications() {
            const playerStore = usePlayerStore();
            localStorage.setItem(
                `wasPromptedToEnableNotifications:${playerStore.player?._id}`,
                "true",
            );
        },
    },
});
