<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { sanitizeUrl } from "@braintree/sanitize-url";
import { goBack } from "../router";
import { useAppStore } from "../stores/app";
import { useGamesStore } from "../stores/games";
import { usePlayerStore } from "../stores/player";
import { botName } from "../../../shared/models/PlayerModels";
import { ensureWebsocketConnected } from "../api/websocket";

const appStore = useAppStore();
const playerStore = usePlayerStore();
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
    {
        name: "Logout",
        icon: "mdi-logout",
        async action() {
            appStore.shouldShowAppDrawer = false;
            await playerStore.logout();
        }
    },
];

const secondaryMenuItems = [
    {
        name: "Refresh",
        condition: null,
        action: () => {
            const currentGame = getCurrentGame();
            if (currentGame) {
                void gamesStore.refreshGame(currentGame._id);
            }
            ensureWebsocketConnected();
        }
    },
    {
        name: "Mark game complete",
        condition: shouldShowMarkGameComplete,
        action: () => {
            const currentGame = getCurrentGame();
            if (currentGame) {
                void gamesStore.markGameComplete(currentGame._id);
            }
        }
    },
    {
        name: "Resend invite",
        condition: () => {
            const currentGame = getCurrentGame();
            if (currentGame) {
                return !currentGame.otherPlayer;
            }
        },
        action: () => {
            const currentGame = getCurrentGame();
            if (currentGame) {
                void gamesStore.invitePlayer(currentGame._id, false);
            }
        }
    }
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
    return getPageName() === "home" ? toggleAppDrawer : handleBackButtonPress;
}

function getCurrentGame() {
    const { currentRoute: { value: { params: { gameId } } } } = router;
    return gamesStore.getGameById(gameId as string);
}

function getTitle() {
    const playerStore = usePlayerStore();
    const pageName = getPageName();
    if (pageName === "home") {
        return playerStore.player?.username ? `Welcome, ${playerStore.player.username}!` : "Active Games";
    } else if (pageName === "games") {
        const otherPlayerUsername = getOtherPlayerUsername();
        return otherPlayerUsername ?
            `Game with ${otherPlayerUsername}` : "Saym game";
    } else if (pageName === "messages") {
        const otherPlayerUsername = getOtherPlayerUsername();
        return otherPlayerUsername ?
            `Conversation with ${otherPlayerUsername}` : "Messages";
    }

    return "Saym"; // should not happen
}

function getOtherPlayerUsername() {
    const game = getCurrentGame();
    return game?.otherPlayer?.username;
}

function toggleAppDrawer() {
    appStore.shouldShowAppDrawer = !appStore.shouldShowAppDrawer;
}

async function handleBackButtonPress() {
    const urlParameters = new URLSearchParams(location.search);
    const backParameter = urlParameters.get("back");
    if (backParameter) {
        await router.push(sanitizeUrl(backParameter));
    }

    await goBack();
}

function shouldShowMarkGameComplete() {
    const currentGame = getCurrentGame();
    return router.currentRoute.value.name === "games" &&
        currentGame &&
        currentGame.playerOneTurns.length > 0 &&
        currentGame.playerTwoTurns.length > 0;
}

function shouldShowMessagesIcon() {
    const currentGame = getCurrentGame();
    return router.currentRoute.value.name === "games" && (currentGame?.otherPlayer ? currentGame.otherPlayer._id !== botName : true);
}

async function goToGameMessages() {
    const currentGame = getCurrentGame();
    const currentGamePath = `/games/${currentGame?._id}`;

    if (currentGame) {
        await router.push(`${currentGamePath}/messages`);
    }
}

function lastMessageIsUnread() {
    const currentGame = getCurrentGame();

    if (currentGame) {
        const playerId = playerStore.player?._id;
        const lastReceivedMessage =
            currentGame.messages.findLast(message => message.playerId !== playerId);

        console.log("last received message:", lastReceivedMessage);

        return Boolean(lastReceivedMessage && !lastReceivedMessage.readByOtherPlayer);
    }

    return false;
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
    <v-app-bar>
        <v-app-bar-nav-icon color="white" @click="handleIconClick">
            <v-icon :icon="icon" />
        </v-app-bar-nav-icon>
        <v-app-bar-title>{{ title }}</v-app-bar-title>
        <v-btn v-if="isHome" size="large" @click="createGameAndNavigate">
            + New
        </v-btn>
        <v-btn v-if="shouldShowMessagesIcon()" icon @click="goToGameMessages">
            <v-badge v-if="lastMessageIsUnread()" color="red" dot>
                <v-icon>mdi-message-text</v-icon>
            </v-badge>
            <v-icon v-else>mdi-message-text</v-icon>
        </v-btn>
        <v-btn v-if="currentGame && !currentGame.isGameComplete" icon>
            <v-icon>mdi-dots-vertical</v-icon>
            <v-menu activator="parent">
                <v-list>
                    <template v-for="(menuItem, idx) in secondaryMenuItems" :key="idx">
                        <v-list-item v-if="menuItem.condition ? menuItem.condition() : true" @click="menuItem.action">
                            {{ menuItem.name }}
                        </v-list-item>
                    </template>
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
