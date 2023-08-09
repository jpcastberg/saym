import { defineStore } from "pinia";
import {
    type UserUpdateModel,
    type UserModel,
} from "../../../shared/models/UserModels";

interface UserState {
    isUserInitialized: boolean;
    userId: string;
    username: string;
}

export const useUserStore = defineStore("user", {
    state: (): UserState => ({
        isUserInitialized: false,
        userId: "",
        username: "",
    }),
    getters: {
        needsUsername(): boolean {
            return this.isUserInitialized && !this.username;
        },
    },
    actions: {
        async updateUsername(newUsername: string): Promise<void> {
            const userUpdateBody: UserUpdateModel = {
                username: newUsername,
            };
            const response = await fetch("/api/users/me", {
                method: "put",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(userUpdateBody),
            }).then((response) => response.json()) as UserModel;
            this.username = response.username;
        },
        async initUser(): Promise<void> {
            if (this.isUserInitialized) {
                return;
            }
            const userResponse = await fetch("/api/users/me").then(
                (response) => response.json(),
            ) as UserModel;
            this.username = userResponse.username;
            this.userId = userResponse._id;
            this.isUserInitialized = true;
        },
    },
});
