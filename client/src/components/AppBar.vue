<script setup lang="ts">
import { useRouter, RouterLink } from "vue-router";
import { useAppStore } from "../stores/app";

const appStore = useAppStore();
const router = useRouter();
router.beforeResolve(to => {
    appStore.appBarTitle = to.meta.appBarTitle as string;
});

function handleIconClick() {
    appStore.isAppDrawerOpen = !appStore.isAppDrawerOpen;
}
</script>

<template>
    <v-app-bar color="teal-darken-1">
        <v-app-bar-nav-icon color="white" @click="handleIconClick">
            <v-icon icon="mdi-menu" />
        </v-app-bar-nav-icon>
        <v-app-bar-title>{{ appStore.appBarTitle }}</v-app-bar-title>
        <v-btn v-if="router.currentRoute.value.name === 'home'" size="large">+ New</v-btn>
    </v-app-bar>
    <v-navigation-drawer v-model="appStore.isAppDrawerOpen" temporary>
        <RouterLink to="/">Home</RouterLink>
    </v-navigation-drawer>
</template>

<style scoped>
.v-app-bar {
    position: relative !important;
}
</style>
