<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useGamesStore } from "../stores/games";
import { useAppStore } from "../stores/app";
import InvitePlayerDialog from "../components/InvitePlayerDialog.vue";
import GameNotFoundDialog from "../components/GameNotFoundDialog.vue";
const router = useRouter();
const gamesStore = useGamesStore();
const turnInput = ref("");
const appStore = useAppStore();

gamesStore.activeGameNotFound = false; // reset value

if (getCurrentGameId() && !gamesStore.activeGame) {
    joinGame(getCurrentGameId());
}

function getCurrentGameId() {
    const { "currentRoute": { "value": { "params": { gameId } } } } = router;
    return gameId as string;
}

function joinGame(gameId: string) {
    void gamesStore.joinGame(gameId)
        .then((joinedGame) => {
            if (!joinedGame) {
                gamesStore.activeGameNotFound = true;
            }
        });
}

const lastWord = computed(() => {
    if (gamesStore.activeGame) {
        return gamesStore.activeGame.playerOneTurns[gamesStore.activeGame.playerOneTurns.length - 1];
    }

    return "";
});

function handleTurnFormSubmit() {
    if (gamesStore.activeGame) {
        void gamesStore.submitTurn(turnInput.value, gamesStore.activeGame._id);
    }

    turnInput.value = "";
}

function getFormPrompt() {
    if (gamesStore.activeGame) {
        const firstOrNext = Math.min(gamesStore.activeGame.playerOneTurns.length, gamesStore.activeGame.playerTwoTurns.length) === 0 ? "first" : "next";
        return `Guess what ${gamesStore.activeGame.otherPlayer?.username ?? "your friend"}'s ${firstOrNext} word will be`;
    }
}

function clearTurnInput() {
    turnInput.value = "";
}

function scrollInputIntoView(event: FocusEvent) {
    const inputElement = event.target as HTMLInputElement;
    setTimeout(() => {
        inputElement.scrollIntoView({
            behavior: "smooth"
        });
    }, 590); // 590 seems to be long enough to wait for the ios mobile keyboard to finish popping
}

async function continuePlayingWithOtherPlayer() {
    if (gamesStore.activeGame?.otherPlayer?._id) {
        const newGame = await gamesStore.createGameWithPlayer(gamesStore.activeGame.otherPlayer._id);
        // todo: when the path changes, reload the game
        await router.push(`/games/${newGame._id}`);
    }
}
</script>

<template>
    <main class="h-100">
        <div v-if="gamesStore.activeGame" class="h-100 pa-4">
            <div class="h-100 d-flex flex-column justify-space-between">
                <div class="d-flex flex-column">
                    <p v-if="gamesStore.activeGame.otherPlayer?.username" class="text-caption text-center pb-2">
                        {{ gamesStore.activeGame.otherPlayer.username }} joined the game
                    </p>
                    <template v-for="displayTurn, idx in gamesStore.activeGame.displayTurns" :key="idx">
                        <div class="turn-item-container d-flex justify-space-between">
                            <div class="w-100 text-center">
                                <v-chip>
                                    {{ displayTurn.currentPlayerTurn }}
                                </v-chip>
                            </div>
                            <div class="w-100 text-center">
                                <span v-if="displayTurn.otherPlayerTurn">
                                    {{ displayTurn.icon }}
                                </span>
                            </div>
                            <div class="w-100 text-center">
                                <v-chip v-if="displayTurn.otherPlayerTurn">
                                    {{ displayTurn.otherPlayerTurn }}
                                </v-chip>
                            </div>
                        </div>
                        <v-divider v-if="idx < gamesStore.activeGame.displayTurns.length - 1" />
                    </template>
                </div>
                <v-card v-if="gamesStore.activeGame.isGameComplete" class="text-center">
                    <v-card-item>
                        <v-card-title>
                            Saym!
                        </v-card-title>
                        <v-card-subtitle>
                            You and {{ gamesStore.activeGame.otherPlayer?.username }} said the saym
                            word{{ lastWord ? `: ${lastWord}` : "" }}.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-divider />
                    <v-btn size="large" class="my-5" color="teal-darken-1" @click="continuePlayingWithOtherPlayer">
                        Keep playing with {{ gamesStore.activeGame.otherPlayer?.username }}
                    </v-btn>
                </v-card>
                <v-card v-else-if="gamesStore.activeGame.hasPlayerPlayedRound && !gamesStore.activeGame.isGameComplete"
                    class="text-center">
                    <v-card-text>
                        Waiting for {{ gamesStore.activeGame.otherPlayer?.username || "your friend" }} to
                        {{ gamesStore.activeGame.otherPlayer ? "go" : "join" }}
                    </v-card-text>
                </v-card>
                <v-form v-else-if="!gamesStore.activeGame.hasPlayerPlayedRound && !gamesStore.activeGame.isGameComplete"
                    class="d-flex align-center justify-center turn-input" @submit.prevent="handleTurnFormSubmit">
                    <v-text-field v-model="turnInput" persistent-clear clearable hide-details="auto" variant="solo"
                        :label="getFormPrompt()" required @click:clear="clearTurnInput" @focus="scrollInputIntoView" />
                    <v-btn type="submit" class="ml-2" size="x-large" density="compact" icon="mdi-arrow-up-thick" />
                </v-form>
            </div>
            <invite-player-dialog v-if="appStore.shouldShowInvitePlayerDialog"
                :game-needing-invite="gamesStore.activeGame" />
        </div>
        <game-not-found-dialog />
    </main>
</template>

<style scoped>
.turn-item-container {
    padding: 5px 0 5px
}

.turn-item-container:first-child {
    padding: 0 0 5px;
}

.turn-item-container:last-child {
    padding: 5px 0 0;
}

.turn-input {
    position: relative;
    bottom: 0;
}
</style>
