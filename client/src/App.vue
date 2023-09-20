<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import { useRouter } from "vue-router";
import DialogWrapper from "./components/DialogWrapper.vue";
import AppBar from "./components/AppBar.vue";
import { useAppStore } from "./stores/app";
import { useGamesStore } from "./stores/games";
const router = useRouter();
const gamesStore = useGamesStore();
let initializationComplete = ref(false);

void initialize();

async function initialize() {
    await useAppStore().initApp();
    initializationComplete.value = true;

    document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible") {
            if (gamesStore.activeGame) {
                await gamesStore.refreshGame(gamesStore.activeGame._id);
            } else if (router.currentRoute.value.name === "home") {
                await gamesStore.initGames();
            }
        }
    });
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
