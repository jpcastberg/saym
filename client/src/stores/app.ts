import { defineStore } from "pinia";
// import { useGamesStore } from "./games";

interface AppState {
    isAppDrawerOpen: boolean;
    appBarTitle: string;
    shouldShowInvitePlayerDialog: boolean;
}

export const useAppStore = defineStore("app", {
    state: (): AppState => ({
        isAppDrawerOpen: false,
        appBarTitle: "",
        shouldShowInvitePlayerDialog: false,
    }),
});
