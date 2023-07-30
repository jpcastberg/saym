import { createRouter, createWebHistory } from "vue-router";
import ActiveGamesView from "@/views/ActiveGamesView.vue";

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
        }
    ]
});

export default router;
