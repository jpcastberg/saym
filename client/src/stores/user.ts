import { ref, computed } from "vue";
import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
    "state": () => ({
        "isUserInitialized": false,
        "userId": "",
        "username": "",
        "usernameInput": ""
    }),
    "getters": {
        needsUsername(): boolean {
            return this.isUserInitialized && !this.username;
        }
    },
    "actions": {
        async updateUsername(newUsername: string) {
            const response = await fetch("/api/users/me", {
                "method": "put",
                "headers": {
                    "content-type": "application/json"
                },
                "body": JSON.stringify({ "username": newUsername })
            }).then(response => response.json());
            console.log("updated username response:", response);
            this.username = newUsername;
        },
        async initUser() {
            const userResponse = await fetch("/api/users/me").then(response => response.json());
            this.username = userResponse.username; // todo, strong typing
            this.userId = userResponse._id;
            this.isUserInitialized = true;
        }
    }
});
