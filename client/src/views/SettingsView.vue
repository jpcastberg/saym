<script setup lang="ts">
import { ref, watch } from "vue";
import { useAppStore } from "../stores/app";
import { usePlayerStore } from "../stores/player";

const appStore = useAppStore();
const playerStore = usePlayerStore();
const smsNotificationsSwitchValue = ref(playerStore.player?.sendSmsNotifications);
const pushNotificationsSwitchValue = ref(playerStore.areNativeNotificationsOn);

watch(smsNotificationsSwitchValue, async (newValue) => {
    if (Boolean(newValue)) {
        await playerStore.turnOnSmsNotifications();
    } else {
        await playerStore.turnOffSmsNotifications();
    }
});

watch(pushNotificationsSwitchValue, async (newValue) => {
    if (Boolean(newValue)) {
        await playerStore.turnOnPushNotifications();
    } else {
        await playerStore.turnOffPushNotifications();
    }
});

function toggleUsernameEditDialog() {
    appStore.playerTriggeredUsernameChange = !appStore.playerTriggeredUsernameChange;
}

function togglePhoneNumberEditDialog() {
    appStore.playerTriggeredPhoneNumberChange = !appStore.playerTriggeredPhoneNumberChange;
}
</script>

<template>
    <main>
        <v-list>
            <v-list-item>
                <v-list-item-title class="pb-2">
                    Username
                </v-list-item-title>
                <div class="w-100 d-flex align-center justify-space-between">
                    <span class="text-h6">
                        {{ playerStore.player?.username }}
                    </span>
                    <v-btn size="large" @click="toggleUsernameEditDialog">
                        <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                </div>
            </v-list-item>
            <v-list-item>
                <v-list-item-title class="pb-2">
                    Phone Number
                </v-list-item-title>
                <div class="w-100 d-flex align-center justify-space-between">
                    <span class="text-h6">
                        {{ playerStore.player?.phoneNumber }}
                    </span>
                    <v-btn size="large" @click="togglePhoneNumberEditDialog">
                        <v-icon>mdi-pencil</v-icon>
                    </v-btn>
                </div>
            </v-list-item>
            <v-divider />
            <v-list-item>
                <v-switch v-model="smsNotificationsSwitchValue" :disabled="!playerStore.player?.phoneNumber" color="success"
                    label="Send SMS Notifications" />
            </v-list-item>
            <v-list-item>
                <v-switch v-if="appStore.areNativeNotificationsSupported" v-model="pushNotificationsSwitchValue"
                    color="success" label="Send Push Notifications" />
            </v-list-item>
        </v-list>
    </main>
</template>

<style scoped>
</style>
