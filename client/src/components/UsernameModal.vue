<script setup lang="ts">
import { useUserStore } from "@/stores/user";
import { useAppStore } from "@/stores/app";
const userStore = useUserStore();
const appStore = useAppStore();
userStore.initUser();

function handleUsernameFormSubmit(event: SubmitEvent) {
    event.preventDefault();
    userStore.updateUsername(appStore.usernameInput);
}

function handleInput(event: InputEvent) {
    const eventTarget = event?.target as HTMLInputElement;
    appStore.usernameInput = eventTarget.value;
}
</script>

<template>
    <v-dialog v-model="userStore.needsUsername">
        <v-card>
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Welcome to Saym!</span>
            </v-card-title>
            <v-form class="pa-5 d-flex flex-column align-center" @submit="handleUsernameFormSubmit">
                <v-card-text class="w-100">
                    <v-text-field v-model="userStore.usernameInput" label="What should we call you?" @input="handleInput"
                        required />
                </v-card-text>
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
                        Let's Go!
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>
</template>
