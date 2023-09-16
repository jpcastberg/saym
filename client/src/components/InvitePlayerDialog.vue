<script setup lang="ts">
import { ref } from "vue";
import { useGamesStore } from "../stores/games";
const gamesStore = useGamesStore();
const isNativeSharingAvailable = "share" in navigator;
const defaultInviteButtonText = isNativeSharingAvailable ? "Invite Player" : "Invite With Url";
const inviteButtonCopiedText = "Url Copied";
const inviteButtonText = ref(defaultInviteButtonText);

function triggerCopiedMessage(): Promise<void> {
    inviteButtonText.value = inviteButtonCopiedText;
    return new Promise((res) => {
        setTimeout(() => {
            res();
        }, 1500);
    });
}

async function invitePlayer(event: SubmitEvent) {
    const gameId = gamesStore.activeGame?._id;
    const inviteBot = event.submitter?.id === "bot-button";

    if (!gameId) {
        return;
    }

    await gamesStore.invitePlayer(gameId, inviteBot);

    if (!isNativeSharingAvailable) {
        await triggerCopiedMessage();
    }

    if (!inviteBot) { // inviting the bot already does this
        await gamesStore.logGameInvite(gameId);
    }
}
</script>

<template>
    <v-card>
        <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
            <span class="text-h5">Choose A Partner</span>
        </v-card-title>
        <v-form class="pa-5 d-flex flex-column align-center" @submit.prevent="invitePlayer">
            <v-card-actions class="py-0">
                <v-btn id="bot-button" size="large" type="submit" color="teal-darken-1" variant="elevated">
                    Play The Bot
                </v-btn>
            </v-card-actions>
            <v-card-actions class="py-0">
                <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
                    {{ inviteButtonText }}
                </v-btn>
            </v-card-actions>
        </v-form>
    </v-card>
</template>
