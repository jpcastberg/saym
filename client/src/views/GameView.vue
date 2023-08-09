<script setup lang="ts">
import { useGamesStore } from "../stores/games";
import { useAppStore } from "../stores/app";
import { useRouter } from "vue-router";
const router = useRouter();
const { "currentRoute": { "value": { "params": { gameId } } } } = router;
const gamesStore = useGamesStore();
await gamesStore.setActiveGame(String(gameId));
const appStore = useAppStore();

function handleTurnFormSubmit(event: SubmitEvent) {
    event.preventDefault();
}

function handleInput(event: InputEvent) {
    const eventTarget = event.target as HTMLInputElement;
    appStore.turnInput = eventTarget.value;
}
</script>

<template>
    <main>
        <div v-if="gamesStore.activeGame">
            <div class="pa-6">
                <div class="d-flex justify-space-between">
                    <div>
                        <div v-for="turn in gamesStore.activeGame.playerOneTurns">
                            {{ turn }}
                        </div>
                    </div>
                    <div>
                        <div v-for="turn in gamesStore.activeGame.playerTwoTurns">
                            {{ turn }}
                        </div>
                    </div>
                </div>
            </div>
            <v-form v-if="gamesStore.activeGame.isCurrentUsersTurn" class="pa-5 d-flex align-center justify-center"
                @submit="handleTurnFormSubmit">
                <v-text-field variant="solo" label="What's your next word?" required @input="handleInput" />
                <v-btn class="ml-2" size="x-large" density="compact" icon="mdi-arrow-up-thick" />
            </v-form>
        </div>
        <div v-else>
            no game ya dingo
        </div>
    </main>
</template>

<style scoped>
</style>
