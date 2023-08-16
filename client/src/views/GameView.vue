<script setup lang="ts">
import { ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useGamesStore } from "../stores/games";
import { useAppStore } from "../stores/app";
import InvitePlayerModal from "../components/InvitePlayerModal.vue";
import { type ComputedGameModel } from "../stores/games";
const router = useRouter();
const gamesStore = useGamesStore();
const { "currentRoute": { "value": { "params": { gameId } } } } = router;
const turnInput = ref("");
const game: Ref<ComputedGameModel | undefined> = ref(gamesStore.getGameById(gameId as string));
const appStore = useAppStore();

const otherPlayerUsername = game.value?.otherPlayer?.username;
const appBarTitle = otherPlayerUsername ?
    `Game with ${otherPlayerUsername}` : "Saym game";
appStore.appBarTitle = appBarTitle;

if (game.value?.needToInvitePlayer) {
    appStore.shouldShowInvitePlayerDialog = true; // todo: determine if this is actually needed, it's really just there for vuetify
}

function handleTurnFormSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (game.value) {
        void gamesStore.submitTurn(turnInput.value, game.value._id)
    }

    turnInput.value = "";
}

function getFormPrompt() {
    if (game.value) {
        const firstOrNext = Math.min(game.value.playerOneTurns.length, game.value.playerTwoTurns.length) === 0 ? "first" : "next"
        return `Guess what ${game.value.otherPlayer?.username ?? "your friend"}'s ${firstOrNext} word will be`
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
    }, 590);
}
</script>

<template>
    <main v-if="game" class="h-100 pa-6">
        <div class="h-100 d-flex flex-column justify-space-between">
            <div class="d-flex flex-column">
                <template v-for="displayTurn, idx in game.displayTurns" :key="idx">
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
                    <v-divider v-if="idx < game.displayTurns.length - 1" />
                </template>
            </div>
            <v-card v-if="game.isGameComplete" class="text-center">
                <v-card-item>
                    <v-card-title>
                        Saym!
                    </v-card-title>
                    <v-card-subtitle>
                        You and {{ game.otherPlayer?.username }} said the saym word:
                        {{ game.playerOneTurns[game.playerOneTurns.length - 1] }}.
                    </v-card-subtitle>
                </v-card-item>
                <v-divider />
                <v-btn size="large" class="my-5" color="teal-darken-1">
                    Keep playing with {{ game.otherPlayer?.username }}
                </v-btn>
            </v-card>
            <v-card v-else-if="game.hasUserPlayedRound && !game.isGameComplete" class="text-center">
                <v-card-text>
                    Waiting for {{ game.otherPlayer?.username }} to go
                </v-card-text>
            </v-card>
            <v-form v-else-if="!game.hasUserPlayedRound && !game.isGameComplete"
                class="d-flex align-center justify-center turn-input" @submit="handleTurnFormSubmit">
                <v-text-field v-model="turnInput" persistent-clear clearable hide-details="auto" variant="solo"
                    :label="getFormPrompt()" required @click:clear="clearTurnInput" @focus="scrollInputIntoView" />
                <v-btn type="submit" class="ml-2" size="x-large" density="compact" icon="mdi-arrow-up-thick" />
            </v-form>
        </div>
        <InvitePlayerModal v-if="game.needToInvitePlayer" :game-needing-invite="game" />
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
