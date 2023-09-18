<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import DialogWrapper from "./components/DialogWrapper.vue";
import AppBar from "./components/AppBar.vue";
import { useAppStore } from "./stores/app";
import { useGamesStore } from "./stores/games";
const gamesStore = useGamesStore();
let initializationComplete = ref(false);
let activeGamePollInterval: NodeJS.Timer;

void initialize();

async function initialize() {
    await useAppStore().initApp();
    initializationComplete.value = true;

    pollActiveGame();
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            pollActiveGame();
        }
    });
}

function pollActiveGame() {
    clearInterval(activeGamePollInterval);
    activeGamePollInterval = setInterval(async () => {
        if (gamesStore.activeGame) {
            await gamesStore.refreshGame(gamesStore.activeGame._id);
        }
    }, 5000);
}
</script>

<template>
    <v-app v-if="initializationComplete">
        <app-bar />
        <dialog-wrapper />
        <router-view />
    </v-app>
</template>

<style scoped>
.v-application {
    max-height: 100vh;
    height: -webkit-fill-available;
}
</style>
