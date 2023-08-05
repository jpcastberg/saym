<script setup lang="ts">
import { useGamesStore } from "@/stores/games";
import { useRouter } from "vue-router";
const router = useRouter();
const gamesStore = useGamesStore();
gamesStore.initGames();
</script>

<template>
    <main>
        <v-list v-if="gamesStore.areGamesInitialized" lines="two">
            <v-list-item v-for="game in gamesStore.currentGames" :key="game._id" :title="game._id"
                v-on:click="event => router.push(`/games/${game._id}`)"
                :subtitle="game.isCurrentUsersTurn ? 'It\'s your turn!' : 'Waiting for other player'" />
        </v-list>
    </main>
</template>

<style scoped>
.v-list-item {
    cursor: pointer;
}
</style>
