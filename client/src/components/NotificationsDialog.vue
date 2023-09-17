<script setup lang="ts">
import { useAppStore } from "../stores/app";
import { usePlayerStore } from "../stores/player";
const appStore = useAppStore();
const playerStore = usePlayerStore();

async function setNotificationPreference(event: SubmitEvent) {
    const sendNotifications = event.submitter?.id === "notification-preference-true";

    if (sendNotifications && appStore.areNativeNotificationsSupported) {
        await playerStore.turnOnPushNotifications();
    }

    appStore.playerClosedNotificationsDialog = true;
    appStore.logWasPromptedToEnableNotifications();
}
</script>

<template>
    <v-card>
        <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
            <span class="text-h5">
                Receive Push Notifications?
            </span>
        </v-card-title>
        <v-card-text class="w-100 px-2 py-0 text-center">
            Notifications relate only to games you are in.
        </v-card-text>
        <v-form class="pt-2 px-5 pb-5 d-flex flex-column align-center" @submit.prevent="setNotificationPreference">
            <v-card-actions class="py-0">
                <v-btn size="large" type="submit" color="grey-lighten-1" variant="elevated">
                    Not Now
                </v-btn>
                <v-btn id="notification-preference-true" size="large" type="submit" color="teal-darken-1"
                    variant="elevated">
                    Yes
                </v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
</template>

<style scoped>
.wrap-text {
    white-space: unset;
}
</style>
