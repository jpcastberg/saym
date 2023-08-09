import { defineStore } from "pinia";
// import { useGamesStore } from "./games";

interface AppState {
    isAppDrawerOpen: boolean;
    appBarTitle: string;
    usernameInput: string;
    turnInput: string;
    shouldShowInvitePlayerDialog: boolean;
    invitePlayerDialogGameId: string;
}

export const useAppStore = defineStore("app", {
    state: (): AppState => ({
        isAppDrawerOpen: false,
        appBarTitle: "",
        usernameInput: "",
        turnInput: "",
        shouldShowInvitePlayerDialog: false,
        invitePlayerDialogGameId: "",
    }),
});
