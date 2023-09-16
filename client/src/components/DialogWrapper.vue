<script setup lang="ts">
import { useAppStore } from "../stores/app";
const appStore = useAppStore();
</script>

<template>
    <v-dialog v-model="appStore.shouldShowDialog" persistent>
        <component :is="appStore.getActiveDialog" />
    </v-dialog>
</template>
