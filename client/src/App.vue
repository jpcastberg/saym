<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import UsernameModal from "./components/UsernameModal.vue";
import AppBar from "./components/AppBar.vue";
import { useGamesStore } from "./stores/games";
import { useUserStore } from "./stores/user";
let initializationComplete = ref(false);
void initialize();

async function initialize() {
    await Promise.all([useUserStore().initUser(), useGamesStore().initGames()]);
    initializationComplete.value = true;
}
</script>

<template>
    <v-app v-if="initializationComplete">
        <AppBar />
        <UsernameModal />
        <RouterView />
    </v-app>
</template>

<style scoped>
</style>
