<script setup lang="ts">
import { onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app';
import { useGamesStore } from '../stores/games';
const appStore = useAppStore();
const gamesStore = useGamesStore();
const router = useRouter();

onUnmounted(() => {
    appStore.isGameNotFound = false;
});

async function createGameAndNavigate() {
    appStore.isGameNotFound = false;
    const newGame = await gamesStore.createGame();
    await router.push(`/games/${newGame._id}`);
}
</script>

<template>
    <v-dialog v-model="appStore.shouldShowGameNotFoundDialog">
        <v-card>
            <v-card-title class="px-5 pt-5 pb-3 d-flex justify-center">
                <span class="text-h5">Game Not Available</span>
            </v-card-title>
            <v-card-subtitle class="text-center text-wrap">
                Most likely a second player already joined that game.
            </v-card-subtitle>
            <v-form class="pa-5 d-flex flex-column align-center" @submit.prevent="createGameAndNavigate">
                <v-card-actions class="py-0">
                    <v-btn size="large" type="submit" color="teal-darken-1" variant="elevated">
                        Start New Game
                    </v-btn>
                </v-card-actions>
            </v-form>
        </v-card>
    </v-dialog>
</template>
