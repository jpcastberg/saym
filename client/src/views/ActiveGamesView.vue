<script setup lang="ts">
import { useRouter } from "vue-router";
import NewGameDialog from "../components/NewGameDialog.vue";
import AboutDialog from "../components/AboutDialog.vue";
import RulesDialog from "../components/RulesDialog.vue";
import { useGamesStore } from "../stores/games";
const router = useRouter();
const gamesStore = useGamesStore();

function handleGameClick(event: MouseEvent | KeyboardEvent, gameId: string | undefined) {
    if (gameId) {
        void router.push(`/games/${gameId}`);
    }
}
</script>

<template>
    <main>
        <div v-if="gamesStore.areGamesInitialized" class="scroll-container">
            <div v-if="gamesStore.currentGames.size > 0">
                <v-list lines="two">
                    <v-list-subheader>Active Games</v-list-subheader>
                    <v-divider />
                    <v-list-item v-for="game in gamesStore.currentGames.values()" :key="game?._id" :title="game?.uiTitle"
                        :subtitle="game?.uiSubtitle" @click="event => handleGameClick(event, game?._id)" />
                </v-list>
            </div>
            <new-game-dialog v-else />
            <div v-if="gamesStore.finishedGames.size > 0">
                <v-list lines="two">
                    <v-list-subheader>Recent Finished Games</v-list-subheader>
                    <v-divider />
                    <v-list-item v-for="game in [...gamesStore.finishedGames.values()].slice(0, 5)" :key="game?._id"
                        :title="game?.uiTitle" :subtitle="game?.uiSubtitle"
                        @click="event => handleGameClick(event, game?._id)" />
                </v-list>
            </div>
        </div>
        <about-dialog />
        <rules-dialog />
    </main>
</template>

<style scoped>
.v-list-item {
    cursor: pointer;
}
</style>
