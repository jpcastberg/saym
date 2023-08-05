<script setup lang="ts">
import { useGamesStore } from "@/stores/games";
import { useRouter } from "vue-router";
const router = useRouter();
const { "currentRoute": { "value": { "params": { gameId } } } } = router;
const gamesStore = useGamesStore();
gamesStore.setActiveGame(String(gameId));
</script>

<template>
    <main>
        <div v-if="gamesStore.activeGame">
            {{ gamesStore.activeGame._id }}
        </div>
        <div v-else>
            no game ya dingo
        </div>
    </main>
</template>

<style scoped>
.v-list-item {
    cursor: pointer;
}
</style>
