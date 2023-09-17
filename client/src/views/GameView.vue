<script setup lang="ts">
import { computed, ref, onMounted, type Ref } from "vue";
import { useRouter } from "vue-router";
import { Fireworks, type FireworksOptions } from "@fireworks-js/vue";
import { useGamesStore } from "../stores/games";
import scrollInputIntoView from "../utils/scrollInputIntoView";
const router = useRouter();
const gamesStore = useGamesStore();
const turnInput = ref("");
const fireworksElement = ref<InstanceType<typeof Fireworks>>();
const shouldRenderFireworks = ref(false);
const scrollContainer: Ref<HTMLDivElement | null> = ref(null);
const isTurnSubmissionInProgress = ref(false);
let endgameWasTriggered = false;

const fireworksOptions = ref<FireworksOptions>({
    acceleration: 1,
    sound: {
        enabled: true,
        files: [
            "/explosion0.mp3",
            "/explosion1.mp3",
            "/explosion2.mp3"
        ]
    }
});

onMounted(() => {
    scrollToBottom();
    if (gamesStore.activeGame?.isGameComplete && !gamesStore.activeGame.sawFinishedGame) {
        triggerEndgame();
    } else {
        gamesStore.$subscribe(() => {
            if (gamesStore.activeGame?.isGameComplete && !gamesStore.activeGame.sawFinishedGame) {
                triggerEndgame();
            }
        });
    }
});

if (getCurrentGameId() && gamesStore.activeGameNotFound) {
    joinGame(getCurrentGameId());
}

function scrollToBottom() {
    scrollContainer.value?.scrollTo({
        top: scrollContainer.value.offsetHeight
    });
}

function triggerEndgame() {
    if (!gamesStore.activeGame || endgameWasTriggered) {
        return;
    }

    endgameWasTriggered = true;
    void new Audio("/tada.mp3").play();
    void triggerFireworks();
    void gamesStore.markFinishedGameAsSeen(gamesStore.activeGame._id);
}

async function triggerFireworks() {
    shouldRenderFireworks.value = true;
    fireworksElement.value?.start();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await fireworksElement.value?.waitStop();
    shouldRenderFireworks.value = false;
}

function getCurrentGameId() {
    const { "currentRoute": { "value": { "params": { gameId } } } } = router;
    return gameId as string;
}

function joinGame(gameId: string) {
    void gamesStore.joinGame(gameId);
}

const lastWord = computed(() => {
    if (gamesStore.activeGame) {
        return gamesStore.activeGame.playerOneTurns[gamesStore.activeGame.playerOneTurns.length - 1];
    }

    return "";
});

async function handleTurnFormSubmit() {
    if (gamesStore.activeGame) {
        isTurnSubmissionInProgress.value = true;
        await gamesStore.submitTurn(gamesStore.activeGame._id, turnInput.value);
    }

    turnInput.value = "";

    scrollToBottom();
    isTurnSubmissionInProgress.value = false;
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

async function continuePlayingWithOtherPlayer() {
    if (gamesStore.activeGame?.otherPlayer?._id) {
        const newGame = await gamesStore.createGameWithPlayer(gamesStore.activeGame.otherPlayer._id);
        // todo: when the path changes, reload the game
        await router.push(`/games/${newGame._id}`);
    }
}
</script>

<template>
    <main>
        <div v-if="gamesStore.activeGame" class="h-100">
            <div class="h-100 d-flex flex-column justify-end pa-2">
                <div ref="scrollContainer" class="d-flex flex-column scroll-container">
                    <p v-if="gamesStore.activeGame.otherPlayer?.username" class="text-caption text-center pb-2">
                        {{ gamesStore.activeGame.otherPlayer.username }} joined the game
                    </p>
                    <template v-for="displayTurn, idx in gamesStore.activeGame.displayTurns" :key="idx">
                        <div class="w-100 d-flex align-center justify-space-between py-4">
                            <div class="w-100 text-center turn">
                                <span>
                                    {{ displayTurn.currentPlayerTurn.text }}
                                </span>
                            </div>
                            <div class="w-100 text-center">
                                <span v-if="displayTurn.otherPlayerTurn">
                                    {{ displayTurn.icon }}
                                </span>
                            </div>
                            <div :class="`w-100 text-center ${displayTurn.otherPlayerTurn ? 'turn' : ''}`">
                                <span v-if="displayTurn.otherPlayerTurn">
                                    {{ displayTurn.otherPlayerTurn.text }}
                                </span>
                            </div>
                        </div>
                        <v-divider v-if="idx < gamesStore.activeGame.displayTurns.length - 1" />
                    </template>
                    <fireworks v-if="gamesStore.activeGame?.isGameComplete && shouldRenderFireworks" ref="fireworksElement"
                        class="fireworks" :options="fireworksOptions" />
                </div>
                <v-card v-if="gamesStore.activeGame.isGameComplete" class="text-center complete-card">
                    <v-card-item>
                        <v-card-title>
                            Saym!
                        </v-card-title>
                        <v-card-subtitle>
                            You and {{ gamesStore.activeGame.otherPlayer?.username }} said the saym
                            word{{ lastWord ? `: ${lastWord.text}` : "" }}.
                        </v-card-subtitle>
                    </v-card-item>
                    <v-divider />
                    <v-btn size="large" class="mt-4" color="teal-darken-1" @click="continuePlayingWithOtherPlayer">
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
                    class="d-flex align-center justify-center py-2 text-input" @submit.prevent="handleTurnFormSubmit">
                    <v-text-field v-model="turnInput" :disabled="isTurnSubmissionInProgress" persistent-clear clearable
                        hide-details="auto" variant="solo" :label="getFormPrompt()" required @click:clear="clearTurnInput"
                        @focus="scrollInputIntoView" />
                    <v-progress-circular v-if="isTurnSubmissionInProgress" class="ml-2" indeterminate />
                    <v-btn v-else :disabled="turnInput.length === 0" type="submit" class="ml-2" size="x-large"
                        density="compact" icon="mdi-arrow-up-thick" />
                </v-form>
            </div>
        </div>
    </main>
</template>

<style scoped>
.turn {
    /* Adjust as needed */
    padding: 5px;
    border-radius: 10px;
    font-size: 20px;
}

.turn:first-child {
    background-color: #00897b;
    /* padding: 0 0 5px; */
}

.turn:last-child {
    background-color: #681EE3;
    /* padding: 5px 0 0; */
}

.fireworks {
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    position: fixed;
    background: rgba(0, 0, 0, 0);
}

.complete-card {
    /* height: 30% !important; */
    min-height: 25%;
}
</style>
