<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { sanitizeUrl } from "@braintree/sanitize-url";
import { useAppStore } from "../stores/app";
import { useGamesStore } from "../stores/games";

const appStore = useAppStore();
const gamesStore = useGamesStore();
const router = useRouter();

const menuItems = [
    {
        name: "Rules",
        icon: "mdi-text-box-outline",
        action() {
            appStore.shouldShowRulesDialog = true;
        }
    },
    {
        name: "About",
        icon: "mdi-information-outline",
        action() {
            appStore.shouldShowAboutDialog = true;
        }
    },
    {
        name: "Settings",
        icon: "mdi-cog",
        action() {
            void router.push("/settings");
        }
    },
];

const icon = computed(getIcon);
const isHome = computed(() => {
    return getPageName() === "home";
});
const currentGame = computed(getCurrentGame);
const title = computed(getTitle);

function getPageName() {
    const { currentRoute: { value: { name } } } = router;
    return name?.toString();
}

function getIcon() {
    return getPageName() === "home" ? "mdi-menu" : "mdi-arrow-left";
}

function getAction() {
    return getPageName() === "home" ? toggleAppDrawer : goBack;
}

function getCurrentGame() {
    const { currentRoute: { value: { params: { gameId } } } } = router;
    return gamesStore.getGameById(gameId as string);
}

function getTitle() {
    const pageName = getPageName();
    if (pageName === "home") {
        return "Active Games";
    } else if (pageName === "games") {
        const game = getCurrentGame();
        const otherPlayerUsername = game?.otherPlayer?.username;
        return otherPlayerUsername ?
            `Game with ${otherPlayerUsername}` : "Saym game";
    }

    return "Saym"; // should not happen
}

function toggleAppDrawer() {
    appStore.shouldShowAppDrawer = !appStore.shouldShowAppDrawer;
}

async function goBack() {
    const urlParameters = new URLSearchParams(location.search);
    const backParameter = urlParameters.get("back");
    if (backParameter) {
        await router.push(sanitizeUrl(backParameter));
    }
    await router.push("/");
}

function refreshGame() {
    const currentGame = getCurrentGame();
    if (currentGame) {
        void gamesStore.refreshGame(currentGame._id);
    }
}

function markGameComplete() {
    const currentGame = getCurrentGame();
    if (currentGame) {
        void gamesStore.markGameComplete(currentGame._id);
    }
}

function canInvite() {
    const currentGame = getCurrentGame();
    if (currentGame) {
        return !currentGame.otherPlayer;
    }
}

function sendInvite() {
    const currentGame = getCurrentGame();
    if (currentGame) {
        void gamesStore.invitePlayer(currentGame._id, false);
    }
}

function canNudge() {
    const currentGame = getCurrentGame();
    return currentGame?.canNudge;
}

function sendNudge() {
    const currentGame = getCurrentGame();
    if (currentGame) {
        void gamesStore.sendNudge(currentGame._id);
    }
}

function handleIconClick() {
    const action = getAction();
    action();
}

async function createGameAndNavigate() {
    const newGame = await gamesStore.createGame();
    await router.push(`/games/${newGame._id}`);
}
</script>

<template>
    <v-app-bar color="teal-darken-1">
        <v-app-bar-nav-icon color="white" @click="handleIconClick">
            <v-icon :icon="icon" />
        </v-app-bar-nav-icon>
        <v-app-bar-title>{{ title }}</v-app-bar-title>
        <v-btn v-if="isHome" size="large" @click="createGameAndNavigate">
            + New
        </v-btn>
        <v-btn v-if="currentGame" icon>
            <v-icon>mdi-dots-vertical</v-icon>
            <v-menu activator="parent">
                <v-list>
                    <v-list-item @click="refreshGame">
                        Refresh
                    </v-list-item>
                    <v-list-item @click="markGameComplete">
                        Mark game complete
                    </v-list-item>
                    <v-list-item :disabled="!canNudge()" @click="sendNudge">
                        Nudge {{ getCurrentGame()?.otherPlayer?.username }}
                    </v-list-item>
                    <v-list-item v-if="canInvite()" @click="sendInvite">
                        Send invite
                    </v-list-item>
                </v-list>
            </v-menu>
        </v-btn>
    </v-app-bar>
    <v-navigation-drawer v-model="appStore.shouldShowAppDrawer" temporary>
        <v-list>
            <v-list-item v-for="( menuItem, idx ) in menuItems " :key="idx" @click="menuItem.action">
                <template #prepend>
                    <v-icon :icon="menuItem.icon" />
                </template>
                <v-list-item-title>
                    {{ menuItem.name }}
                </v-list-item-title>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>
</template>

<style scoped>
.v-app-bar {
    position: relative !important;
}
</style>
