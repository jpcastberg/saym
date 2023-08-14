<script setup lang="ts">
import { useRouter } from "vue-router";
import { useGamesStore } from "../stores/games";
const router = useRouter();
const gamesStore = useGamesStore();
void gamesStore.initGames();

function handleGameClick(event: MouseEvent | KeyboardEvent, gameId: string) {
    void router.push(`/games/${gameId}`)
}
</script>

<template>
    <main>
        <v-list v-if="gamesStore.areGamesInitialized" lines="two">
            <v-list-item v-for="game in gamesStore.currentGames" :key="game._id" :title="game.uiTitle"
                :subtitle="game.uiSubtitle" @click="event => handleGameClick(event, game._id)" />
        </v-list>
    </main>
</template>

<style scoped>
.v-list-item {
    cursor: pointer;
}
</style>
