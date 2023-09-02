<script setup lang="ts">
import { ref, watch } from "vue";
import { useAppStore } from "../stores/app";
import { usePlayerStore } from "../stores/player";
import validateUsername from "../utils/validateUsername";

const appStore = useAppStore();
const playerStore = usePlayerStore();
const notificationsSwitchValue = ref(playerStore.player?.sendNotifications);

const usernameInput = ref("");
const shouldShowUsernameEditDialog = ref(false);

watch(notificationsSwitchValue, async (newValue) => {
    await playerStore.setNotificationPreference(Boolean(newValue));
});

function toggleUsernameEditDialog() {
    shouldShowUsernameEditDialog.value = !shouldShowUsernameEditDialog.value;
}

async function setUsername(event: SubmitEvent) {
    if (event.submitter?.id === "submit-username") {
        await playerStore.updateUsername(usernameInput.value);
    }

    toggleUsernameEditDialog();
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
            <v-divider />
            <v-list-item v-if="appStore.shouldShowNotificationSettingsToggle" class="">
                <v-switch v-model="notificationsSwitchValue" color="success" label="Send Notifications" />
            </v-list-item>
        </v-list>
        <v-dialog v-model="shouldShowUsernameEditDialog">
            <v-card>
                <v-form class="pa-5 d-flex flex-column align-center" @submit.prevent="setUsername">
                    <v-text-field v-model="usernameInput" class="w-100" :rules="[validateUsername]"
                        label="What should we call you?" required />
                    <v-card-text class="w-100 pt-0 px-0 text-center">
                        Choose a name your friends will recognize.
                    </v-card-text>
                    <v-card-actions class="py-0">
                        <v-btn size="large" type="submit" color="grey-lighten-1" variant="elevated">
                            Cancel
                        </v-btn>
                        <v-btn id="submit-username" size="large" type="submit" color="teal-darken-1" variant="elevated">
                            Submit
                        </v-btn>
                    </v-card-actions>
                </v-form>
            </v-card>
        </v-dialog>
    </main>
</template>

<style scoped>
</style>
