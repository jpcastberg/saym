<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app';
import { useGamesStore } from '../stores/games';
const appStore = useAppStore();
const gamesStore = useGamesStore();
const router = useRouter();

async function createGameAndNavigate() {
    const newGame = await gamesStore.createGame();
    await router.push(`/games/${newGame._id}`);
}
</script>

<template>
    <v-dialog v-model="appStore.shouldShowNewGameDialog">
        <v-card>
            <v-card-title class="px-5 pt-5 pb-0 d-flex justify-center">
                <span class="text-h5">No Active Games</span>
            </v-card-title>
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
