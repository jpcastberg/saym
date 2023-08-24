<script setup lang="ts">
import { computed, ref } from "vue";
import { useGamesStore } from "../stores/games";
import { useUserStore } from "../stores/user";
import { type ComputedGameModel } from "../stores/games";
const props = defineProps<{
    gameNeedingInvite: ComputedGameModel
}>();
const userStore = useUserStore();
const gamesStore = useGamesStore();
const isNativeSharingAvailable = "share" in navigator;
const defaultInviteButtonText = isNativeSharingAvailable ? "Invite Player" : "Invite With Url";
const inviteButtonCopiedText = "Url Copied";
const inviteButtonText = ref(defaultInviteButtonText);
const shouldShowInvitePlayerDialog = computed(() => props.gameNeedingInvite.needToInvitePlayer);

function triggerCopiedMessage(): Promise<void> {
    inviteButtonText.value = inviteButtonCopiedText;
    return new Promise((res) => {
        setTimeout(() => {
            res();
        }, 1500);
    });
}

function invitePlayer(event: SubmitEvent) {
    const gameId = props.gameNeedingInvite._id;

    if (event.submitter?.id === "bot-button") {
        void gamesStore.inviteBot(gameId);
        return;
    }

    const shareLink = `${location.protocol}//${location.host}/games/${gameId}`;

    if (isNativeSharingAvailable) {
        void navigator.share({
            "title": "Come play Saym!",
            "text": `${userStore.username} is inviting you to play Saym with them. Follow this link to join:`,
            "url": shareLink
        }).then(() => {
            return gamesStore.logGameInvite(gameId);
        });
    } else {
        void navigator.clipboard.writeText(shareLink)
            .then(async () => {
                return triggerCopiedMessage();
            })
            .then(() => {
                void gamesStore.logGameInvite(gameId);
            });
    }

}
</script>

<template>
    <v-dialog v-model="shouldShowInvitePlayerDialog">
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
    </v-dialog>
</template>
