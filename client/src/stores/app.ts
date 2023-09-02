import { defineStore } from "pinia";
import { useGamesStore } from "./games";
import { usePlayerStore } from "./player";

interface AppState {
    shouldShowAppDrawer: boolean;
    shouldShowRulesDialog: boolean;
    shouldShowAboutDialog: boolean;
}

export const useAppStore = defineStore("app", {
    state: (): AppState => ({
        shouldShowAppDrawer: false,
        shouldShowRulesDialog: false,
        shouldShowAboutDialog: false,
    }),
    getters: {
        shouldShowInvitePlayerDialog() {
            const gamesStore = useGamesStore();
            const playerStore = usePlayerStore();
            return (
                !playerStore.playerNeedsInitialization &&
                gamesStore.activeGame?.needToInvitePlayer
            );
        },
        shouldShowGameNotFoundDialog() {
            const playerStore = usePlayerStore();
            const gamesStore = useGamesStore();
            return (
                !playerStore.playerNeedsInitialization &&
                gamesStore.activeGameNotFound
            );
        },
        areNativeNotificationsSupported() {
            return "serviceWorker" in navigator && "PushManager" in window;
        },
        shouldShowNotificationsDialog() {
            const playerStore = usePlayerStore();
            return (
                playerStore.player?.sendNotifications === null &&
                !playerStore.needsUsername &&
                "serviceWorker" in navigator
            );
        },
        shouldShowNotificationSettingsToggle(): boolean {
            const playerStore = usePlayerStore();
            return (
                this.areNativeNotificationsSupported ||
                playerStore.player?.sendNotifications !== null
            );
        },
    },
});
