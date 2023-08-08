<script setup lang="ts">
import { RouterView } from "vue-router";
import UsernameModal from "./components/UsernameModal.vue";
import AppBar from "./components/AppBar.vue";
</script>

<template>
    <v-app>
        <AppBar />
        <UsernameModal />
        <RouterView />
        <div></div>
    </v-app>
</template>

<style scoped>
</style>
