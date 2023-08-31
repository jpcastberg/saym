import { defineStore } from "pinia";
import { useGamesStore } from "./games";
import { useUserStore } from "./user";

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
            const userStore = useUserStore();
            return (
                !userStore.userNeedsInitialization &&
                gamesStore.activeGame?.needToInvitePlayer
            );
        },
        shouldShowNewGameDialog() {
            const gamesStore = useGamesStore();
            const userStore = useUserStore();
            return (
                !userStore.userNeedsInitialization &&
                gamesStore.currentGames.size === 0
            );
        },
        shouldShowGameNotFoundDialog() {
            const userStore = useUserStore();
            const gamesStore = useGamesStore();
            return (
                !userStore.userNeedsInitialization &&
                gamesStore.activeGameNotFound
            );
        },
        shouldShowNotificationsDialog() {
            const userStore = useUserStore();
            return (
                userStore.user?.sendNotifications === null &&
                !userStore.needsUsername &&
                "serviceWorker" in navigator
            );
        },
    },
});
