<script setup lang="ts">
import { ref, watch } from 'vue';
import UAParser from "ua-parser-js";
import { usePlayerStore } from '../stores/player';

const playerStore = usePlayerStore();
const notificationsSwitchValue = ref(playerStore.player?.sendNotifications);

watch(notificationsSwitchValue, (newValue, oldValue) => {
    const uaParser = new UAParser();

    console.log(uaParser.getResult());
    if (newValue && newValue !== oldValue) {

    }
});
</script>

<template>
    <main>
        <v-list>
            <v-list-item>
                <v-switch v-model="notificationsSwitchValue" label="Notifications" />
            </v-list-item>
        </v-list>
    </main>
</template>

<style scoped>
</style>
