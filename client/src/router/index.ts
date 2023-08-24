import { createRouter, createWebHistory } from "vue-router";
import { type Component } from "vue";
import ActiveGamesView from "../views/ActiveGamesView.vue";
import GameView from "../views/GameView.vue";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "home",
            component: ActiveGamesView as Component,
        },
        {
            path: "/games/:gameId",
            name: "games",
            component: GameView as Component,
        },
    ],
});

export default router;
