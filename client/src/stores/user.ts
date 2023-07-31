import { defineStore } from "pinia";
import { type UserUpdateModel, type UserModel } from "../../../shared/models/UserModels";

interface UserState {
    isUserInitialized: boolean,
    userId: string,
    username: string
}

export const useUserStore = defineStore("user", {
    "state": (): UserState => ({
        "isUserInitialized": false,
        "userId": "",
        "username": ""
    }),
    "getters": {
        needsUsername(): boolean {
            return this.isUserInitialized && !this.username;
        }
    },
    "actions": {
        async updateUsername(newUsername: string): Promise<void> {
            const userUpdateBody: UserUpdateModel = {
                "username": newUsername
            };
            const response: UserModel = await fetch("/api/users/me", {
                "method": "put",
                "headers": {
                    "content-type": "application/json"
                },
                "body": JSON.stringify(userUpdateBody)
            }).then(response => response.json());
            this.username = response.username;
        },
        async initUser(): Promise<void> {
            const userResponse: UserModel = await fetch("/api/users/me").then(response => response.json());
            this.username = userResponse.username;
            this.userId = userResponse._id;
            this.isUserInitialized = true;
        }
    }
});