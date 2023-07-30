import { defineStore } from "pinia";

export const useAppStore = defineStore("app", {
    "state": () => ({
        "isAppDrawerOpen": false,
        "appBarTitle": "",
        "usernameInput": ""
    })
});
