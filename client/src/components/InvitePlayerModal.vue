<script setup lang="ts">
import { ref } from "vue";
import { useAppStore } from "../stores/app";
import { useGamesStore } from "../stores/games";
import { useUserStore } from "../stores/user";
import { type ComputedGameModel } from "../stores/games";
const props = defineProps<{
    gameNeedingInvite: ComputedGameModel
}>()
const appStore = useAppStore();
const userStore = useUserStore();
const gamesStore = useGamesStore();
const isNativeSharingAvailable = "share" in navigator;
const defaultInviteButtonText = isNativeSharingAvailable ? "Invite Player" : "Invite With Url";
const inviteButtonCopiedText = "Url Copied"
const inviteButtonText = ref(defaultInviteButtonText);

function triggerCopiedMessage(): Promise<void> {
    inviteButtonText.value = inviteButtonCopiedText;
    return new Promise((res) => {
        setTimeout(() => {
            res()
        }, 1500);
    });
}

function invitePlayer(event: SubmitEvent) {
    event.preventDefault();
    const gameId = props.gameNeedingInvite._id;
    const shareLink = `${location.protocol}//${location.host}/games/${gameId}`;

    if (isNativeSharingAvailable) {
        void navigator.share({
            "title": "Come play Saym!",
            "text": `${userStore.username} is inviting you to play Saym with them. Follow this link to join:`,
            "url": shareLink
        }).then(() => {
            return gamesStore.logGameInvite(gameId);
        }).finally(() => {
            appStore.shouldShowInvitePlayerDialog = false;
        });
    } else {
        void navigator.clipboard.writeText(shareLink)
            .then(async () => {
                await gamesStore.logGameInvite(gameId);
                return triggerCopiedMessage()
            })
            .finally(() => {
                appStore.shouldShowInvitePlayerDialog = false;
            });
    }

}
</script>

<template>
    <v-dialog v-model="appStore.shouldShowInvitePlayerDialog">
        <v-card>
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Choose A Partner</span>
            </v-card-title>
            <v-form class="pa-5 d-flex flex-column align-center" @submit="invitePlayer">
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
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
