<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import UserInitializationDialog from "./components/UserInitializationDialog.vue";
import AppBar from "./components/AppBar.vue";
import { useGamesStore } from "./stores/games";
import { useUserStore } from "./stores/user";
let initializationComplete = ref(false);
void initialize();

async function initialize() {
    await useUserStore().initUser();
    await useGamesStore().initGames(); // game initialization depends on initialized user
    initializationComplete.value = true;
}
</script>

<template>
    <v-app v-if="initializationComplete">
        <app-bar />
        <user-initialization-dialog />
        <router-view />
    </v-app>
</template>

<style scoped>
</style>
