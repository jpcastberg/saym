<script setup lang="ts">
import { useGamesStore } from "../stores/games";
import { useRouter } from "vue-router";
import InvitePlayerModal from "../components/InvitePlayerModal.vue";
const router = useRouter();
const gamesStore = useGamesStore();
gamesStore.initGames();

function handleGameClick(event: MouseEvent | KeyboardEvent, gameId: string) {
    const clickedGame = gamesStore.getGameById(gameId);

    if (clickedGame && !clickedGame.playerTwoUserId) {

    }
}

async function startNewGame() {

}
</script>

<template>
    <main>
        <v-list v-if="gamesStore.areGamesInitialized" lines="two">
            <v-list-item v-for="game in gamesStore.currentGames" :key="game._id" :title="game._id"
                v-on:click="event => handleGameClick(event, game._id)"
                :subtitle="game.isCurrentUsersTurn ? 'It\'s your turn!' : 'Waiting for other player'" />
        </v-list>
        <InvitePlayerModal />
    </main>
</template>

<style scoped>
.v-list-item {
    cursor: pointer;
}
</style>
