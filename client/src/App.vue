<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import DialogWrapper from "./components/DialogWrapper.vue";
import AppBar from "./components/AppBar.vue";
import { useGamesStore } from "./stores/games";
import { usePlayerStore } from "./stores/player";
const playerStore = usePlayerStore();
let initializationComplete = ref(false);

void initialize();

async function initialize() {
    await playerStore.initPlayer();
    await useGamesStore().initGames(); // game initialization depends on initialized player
    initializationComplete.value = true;
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
