<script setup lang="ts">
// import { useGamesStore } from "../stores/games";
import { useAppStore } from "../stores/app";
const appStore = useAppStore();
// const gamesStore = useGamesStore();
function invitePlayer(event: SubmitEvent) {
    event.preventDefault();
}
</script>

<template>
    <v-dialog v-model="appStore.shouldShowInvitePlayerDialog">
        <v-card>
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">Nobody's Here...</span>
            </v-card-title>
            <v-form class="pa-5 d-flex flex-column align-center" @submit="invitePlayer">
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
                        Invite Player
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>
</template>
