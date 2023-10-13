<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useGamesStore, type ComputedGameModel } from "../stores/games";
import InstallPrompt from "../components/InstallPrompt.vue";
import logger from "../api/logger";
const router = useRouter();
const gamesStore = useGamesStore();

onMounted(initGames);

async function initGames() {
    await gamesStore.initGames().catch((error) => {
        console.error(error);
        logger.error("init_games_error", {});
    });
}

function handleGameClick(event: MouseEvent | KeyboardEvent, gameId: string | undefined) {
    if (gameId) {
        void router.push(`/games/${gameId}`);
    }
}

function getGameTitle(game: ComputedGameModel) {
    return game.otherPlayer ? `Game with ${game.otherPlayer.username ?? "your friend"}` : "Pending Game";
}

function getGameSubtitle(game: ComputedGameModel) {
    let uiSubtitle;

    if (game.otherPlayer) {
        if (game.isGameComplete) {
            const lastWord = game.currentPlayerTurns[game.currentPlayerTurns.length - 1];
            // last word may be undefined if the game was ended prior to any guesses
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            uiSubtitle = `Saym! You both guessed ${lastWord?.text}.`;
        } else if (game.hasPlayerPlayedRound) {
            uiSubtitle = `Waiting for ${game.otherPlayer.username ?? "your friend"
                } to go`;
        } else {
            uiSubtitle = "Ready for your word!";
        }
    } else {
        if (game.needToInvitePlayer) {
            uiSubtitle = "Invite someone to play!";
        } else if (!game.hasPlayerPlayedRound) {
            uiSubtitle = "Submit your first word while waiting";
        } else {
            uiSubtitle = "Waiting for other player to join...";
        }
    }

    return uiSubtitle;
}

</script>

<template>
    <main>
        <div v-if="gamesStore.areGamesInitialized" class="scroll-container">
            <div v-if="gamesStore.currentGamesSize > 0">
                <v-list lines="two">
                    <v-list-subheader>Active Games</v-list-subheader>
                    <v-divider />
                    <v-list-item v-for="game in gamesStore.currentGames.values()" :key="game?._id"
                        :title="getGameTitle(game!)" :subtitle="getGameSubtitle(game!)"
                        @click="event => handleGameClick(event, game?._id)" />
                </v-list>
            </div>
            <div v-if="gamesStore.finishedGamesSize > 0">
                <v-list lines="two">
                    <v-list-subheader>Recent Finished Games</v-list-subheader>
                    <v-divider />
                    <v-list-item v-for="game in [...gamesStore.finishedGames.values()].slice(0, 5)" :key="game?._id"
                        :title="getGameTitle(game!)" :subtitle="getGameSubtitle(game!)"
                        @click="event => handleGameClick(event, game?._id)" />
                </v-list>
            </div>
        </div>
    </main>
    <install-prompt />
</template>

<style scoped>
.v-list-item {
    cursor: pointer;
}
</style>
