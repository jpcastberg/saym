<script setup lang="ts">
import { useRouter } from "vue-router";
import { useGamesStore } from "../stores/games";
const gamesStore = useGamesStore();
const router = useRouter();

async function createGameAndNavigate() {
    const newGame = await gamesStore.createGame();
    await router.push(`/games/${newGame._id}`);
}
</script>

<template>
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
</template>
