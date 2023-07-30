<script setup lang="ts">
import { RouterView, useRouter } from "vue-router";
import { useAppStore } from "@/stores/app";

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
    <v-app>
        <v-app-bar color="teal-darken-1">
            <v-app-bar-nav-icon color="white" @click="handleIconClick">
                <v-icon icon="mdi-menu" />
            </v-app-bar-nav-icon>
            <v-app-bar-title>{{ appStore.appBarTitle }}</v-app-bar-title>
        </v-app-bar>
        <v-navigation-drawer v-model="appStore.isAppDrawerOpen" temporary>
            teehee
        </v-navigation-drawer>
        <UsernameModal />
        <RouterView />
    </v-app>
</template>

<style scoped>
</style>
