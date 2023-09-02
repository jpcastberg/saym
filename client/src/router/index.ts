import { createRouter, createWebHistory } from "vue-router";
import { type Component } from "vue";
import ActiveGamesView from "../views/ActiveGamesView.vue";
import GameView from "../views/GameView.vue";
import MessagesView from "../views/MessagesView.vue";
import SettingsView from "../views/SettingsView.vue";

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
        {
            path: "/games/:gameId/messages",
            name: "messages",
            component: MessagesView as Component,
        },
        {
            path: "/settings",
            name: "settings",
            component: SettingsView as Component,
        },
    ],
});

export async function goBack() {
    const { currentRoute } = router;
    if (currentRoute.value.name === "messages") {
        const {
            currentRoute: {
                value: {
                    params: { gameId },
                },
            },
        } = router;

        await router.replace(`/games/${gameId as string}`);
    } else {
        await router.replace("/");
    }
}

export default router;
