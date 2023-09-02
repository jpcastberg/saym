<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import PlayerInitializationDialog from "./components/PlayerInitializationDialog.vue";
import AppBar from "./components/AppBar.vue";
import { useGamesStore } from "./stores/games";
import { usePlayerStore } from "./stores/player";
let initializationComplete = ref(false);
void initialize();

async function initialize() {
    await usePlayerStore().initPlayer();
    await useGamesStore().initGames(); // game initialization depends on initialized player
    initializationComplete.value = true;
}
</script>

<template>
    <v-app v-if="initializationComplete" class="h-screen">
        <app-bar />
        <player-initialization-dialog />
        <router-view />
    </v-app>
</template>

<style scoped>
.v-application {
    /* background-color: aqua !important; */
    max-height: 100vh;
}
</style>
