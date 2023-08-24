<script setup lang="ts">
import { useAppStore } from '../stores/app';
const appStore = useAppStore();

function closeDialog() {
    appStore.shouldShowRulesDialog = false;
}
</script>

<template>
    <v-dialog v-model="appStore.shouldShowRulesDialog">
        <v-card class="pa-2">
            <v-card-item>
                <v-card-title>Saym Rules</v-card-title>
            </v-card-item>
            <v-card-text>
                <p><strong>Players:</strong> 2 (You can either invite another player or play against the bot.)</p>

                <p><strong>Objective:</strong> Correctly guess the word submitted by the other player.</p>
                <br>
                <ol class="rules-list">
                    <li>
                        Two players take turns submitting a word.
                    </li>
                    <li>
                        Once both players have submitted their words, the other player's word is revealed.
                    </li>

                    <li>
                        If you correctly guess the other player's word, you win the game. If not, the game continues.
                    </li>

                    <li>
                        If the game continues, you must use all previously guessed words as context to guess a new word.
                    </li>

                    <li>
                        With each turn, more context is built from previous guesses, helping players guess the same word.
                    </li>

                    <li>
                        Repeat steps 1-5 until a player correctly guesses the other player's word or decides to end the
                        game.
                    </li>
                </ol>
            </v-card-text>
            <v-btn size="large" color="teal-darken-1" @click="closeDialog">Got It!</v-btn>
        </v-card>
    </v-dialog>
</template>

<style scoped>
.rules-list {
    list-style-position: inside;
}
</style>
