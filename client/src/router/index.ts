import { createRouter, createWebHistory } from "vue-router";
import ActiveGamesView from "../views/ActiveGamesView.vue";
import GameView from "../views/GameView.vue";

const router = createRouter({
    "history": createWebHistory(import.meta.env.BASE_URL),
    "routes": [
        {
            "path": "/",
            "name": "home",
            "component": ActiveGamesView,
            "meta": {
                "appBarTitle": "Active Games!"
            }
        },
        {
            "path": "/games/:gameId",
            "name": "games",
            "component": GameView,
            "meta": {
                "appBarTitle": "Your mom!"
            }
        }
    ]
});

export default router;
