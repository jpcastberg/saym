import { defineStore, type StoreDefinition } from "pinia";

export const useUsernameFormStore: StoreDefinition = defineStore({
    "id": "username-form",
    "state": () => {
        const errors: string[] = [];
        return {
            username: "",
            errors
        }
    },
    "actions": {
        updateState(inputValue: string) {
            this.username = inputValue;
        },
        save() {
            const username = this.username.trim();

            if (this.username.length < 3) {
                this.errors.push("Username must be at least 3 characters")
            }
        }
    }
});
