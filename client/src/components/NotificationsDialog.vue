<script setup lang="ts">
import { computed } from "vue";
import { useAppStore } from "../stores/app";
import { usePlayerStore } from "../stores/player";
const appStore = useAppStore();
const playerStore = usePlayerStore();
const bothPushAndSmsNotificationsAreOn = computed(() => {
    return Boolean(playerStore.areNativeNotificationsOn && playerStore.player?.sendSmsNotifications);
});

async function setNotificationPreference(event: SubmitEvent) {
    const sendNotifications = event.submitter?.id === "notification-preference-true";

    if (sendNotifications) {
        if (appStore.areNativeNotificationsSupported) {
            await playerStore.turnOnPushNotifications();
        } else {
            await playerStore.turnOnSmsNotifications();
        }
    }

    if (!bothPushAndSmsNotificationsAreOn.value) {
        appStore.playerClosedNotificationsDialog = true;
        playerStore.logWasPromptedToEnableNotifications();
    }
}

async function handleNotificationOverloadSubmit(event: SubmitEvent) {
    const id = event.submitter?.id;
    if (id === "disable-push") {
        await playerStore.turnOffPushNotifications();
    } else if (id === "disable-sms") {
        await playerStore.turnOffSmsNotifications();
    }

    appStore.playerClosedNotificationsDialog = true;
    playerStore.logWasPromptedToEnableNotifications();
}
</script>

<template>
    <v-card>
        <template v-if="bothPushAndSmsNotificationsAreOn">
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center wrap-text">
                <span class="text-h5 text-center">
                    Possible Notification Overload Detected
                </span>
            </v-card-title>
            <v-card-text class="w-100 px-2 py-0 text-center">
                You are set to receive both SMS and push notifications. Would you like to disable one of them? You can
                always
                change your preference in Settings.
            </v-card-text>
            <v-form class="pt-2 px-5 pb-5 d-flex flex-column align-center"
                @submit.prevent="handleNotificationOverloadSubmit">
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="grey-lighten-1" variant="elevated">
                        Leave As-Is
                    </v-btn>
                    <v-btn id="disable-push" size="large" type="submit" color="grey-lighten-1" variant="elevated">
                        Disable Push
                    </v-btn>
                </v-card-actions>
                <v-card-actions class="w-100">
                    <v-btn id="disable-sms" class="w-100" size="large" type="submit" color="teal-darken-1"
                        variant="elevated">
                        Disable SMS
                    </v-btn>
                </v-card-actions>
            </v-form>
        </template>
        <template v-else>
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">
                    Receive {{ appStore.areNativeNotificationsSupported ? "Push" : "SMS" }} Notifications?
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
        </template>
    </v-card>
</template>

<style scoped>
.wrap-text {
    white-space: unset;
}
</style>
