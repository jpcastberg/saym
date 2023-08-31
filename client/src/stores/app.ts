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
        shouldShowNewGameDialog() {
            const gamesStore = useGamesStore();
            const playerStore = usePlayerStore();
            return (
                !playerStore.playerNeedsInitialization &&
                gamesStore.currentGames.size === 0
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
        shouldShowNotificationsDialog() {
            const playerStore = usePlayerStore();
            return (
                playerStore.player?.sendNotifications === null &&
                !playerStore.needsUsername &&
                "serviceWorker" in navigator
            );
        },
    },
});
