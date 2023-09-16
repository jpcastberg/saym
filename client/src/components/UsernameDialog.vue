<script setup lang="ts">
import { ref } from "vue";
import { useAppStore } from "../stores/app";
import { usePlayerStore } from "../stores/player";
import validateUsername from "../utils/validateUsername";
const appStore = useAppStore();
const playerStore = usePlayerStore();
const usernameInput = ref(playerStore.player?.username ?? "");

async function setUsername() {
    await playerStore.updateUsername(usernameInput.value);
    appStore.playerTriggeredUsernameChange = false;
}
</script>

<template>
    <v-card>
        <v-card-title class="pt-5 px-5 pb-3 d-flex justify-center">
            <span class="text-h5">Enter Your Username</span>
        </v-card-title>
        <v-form class="pt-0 px-5 pb-5 d-flex flex-column align-center" @submit.prevent="setUsername">
            <v-text-field v-model="usernameInput" class="w-100" :rules="[validateUsername]" label="What should we call you?"
                required />
            <v-card-text class="w-100 pt-0 px-0 text-center">
                Choose a name your friends will recognize.
            </v-card-text>
            <v-card-actions class="py-0">
                <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
                    Submit
                </v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
</template>
