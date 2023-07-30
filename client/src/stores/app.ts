import { defineStore } from "pinia";

interface AppState {
    isAppDrawerOpen: boolean,
    appBarTitle: string,
    usernameInput: string
}

export const useAppStore = defineStore("app", {
    "state": (): AppState => ({
        "isAppDrawerOpen": false,
        "appBarTitle": "",
        "usernameInput": ""
    })
});
