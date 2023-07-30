<script setup lang="ts">
import { useGamesStore } from "@/stores/games";
const gamesStore = useGamesStore();
</script>

<template>
    <main>
        <v-list lines="two">

            <v-list-item v-for="game in gamesStore.getCurrentGames" :key="file.title" :title="file.title"
                :subtitle="file.subtitle">
                <template v-slot:prepend>
                    <v-avatar :color="file.color">
                        <v-icon color="white">{{ file.icon }}</v-icon>
                    </v-avatar>
                </template>

                <template v-slot:append>
                    <v-btn color="grey-lighten-1" icon="mdi-information" variant="text"></v-btn>
                </template>
            </v-list-item>
        </v-list>
    </main>
</template>
