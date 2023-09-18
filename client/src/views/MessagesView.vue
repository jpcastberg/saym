<script setup lang="ts">
import { ref, onMounted, type Ref } from "vue";
import { useRouter } from "vue-router";
import scrollInputIntoView from "../utils/scrollInputIntoView";
import { useGamesStore } from "../stores/games";
import { type MessageModel } from "../../../shared/models/GameModels";
import { usePlayerStore } from "../stores/player";
const router = useRouter();
const playerStore = usePlayerStore();
const gamesStore = useGamesStore();
const messageInput = ref("");

const scrollContainer: Ref<HTMLDivElement | null> = ref(null);

onMounted(async () => {
    if (gamesStore.activeGame?._id) {
        await gamesStore.refreshGame(gamesStore.activeGame._id);
    }

    scrollToBottom();
});

void (async function () {
    if (getCurrentGameId() && !gamesStore.activeGame) {
        await joinGame(getCurrentGameId());
    }

    await markLastMessageRead();
})();

gamesStore.$subscribe(markLastMessageRead);

function scrollToBottom() {
    scrollContainer.value?.scrollTo({
        top: scrollContainer.value.offsetHeight
    });
}

async function markLastMessageRead() {
    if (gamesStore.activeGame) {
        const playerId = playerStore.player?._id;
        const lastReceivedMessage =
            gamesStore.activeGame.messages.findLast(message => message.playerId !== playerId);

        if (lastReceivedMessage && !lastReceivedMessage.readByOtherPlayer) {
            await gamesStore.markMessageRead(gamesStore.activeGame._id, lastReceivedMessage._id);
        }
    }
}

function getCurrentGameId() {
    const { "currentRoute": { "value": { "params": { gameId } } } } = router;
    return gameId as string;
}

async function joinGame(gameId: string) {
    const joinedGame = await gamesStore.joinGame(gameId);
    if (joinedGame) {
        return joinedGame;
    }
}

async function handleMessageFormSubmit() {
    if (gamesStore.activeGame && messageInput.value.trim() !== "") {
        await gamesStore.submitMessage(getCurrentGameId(), messageInput.value);
    }

    messageInput.value = "";
    scrollToBottom();
}

function clearMessageInput() {
    messageInput.value = "";
}

function getMessageClass(message: MessageModel) {
    return message.playerId === playerStore.player?._id ?
        "sent" : "received";
}
</script>

<template>
    <main>
        <template v-if="gamesStore.activeGame">
            <div class="h-100 d-flex flex-column justify-end justify-end pa-2">
                <div ref="scrollContainer" class="d-flex flex-column align-end scroll-container">
                    <template v-for="message, idx in gamesStore.activeGame.messages" :key="message._id">
                        <span
                            :class="`message ${idx === gamesStore.activeGame.messages.length - 1 ? 'mb-0' : 'mb-2'} ${getMessageClass(message)}`">
                            {{ message.text }}
                        </span>
                    </template>
                </div>
                <v-form class="d-flex align-center justify-center py-2 text-input"
                    @submit.prevent="handleMessageFormSubmit">
                    <v-textarea v-model="messageInput" rows="1" auto-grow persistent-clear clearable hide-details="auto"
                        variant="solo" label="Message" required @click:clear="clearMessageInput"
                        @focus="scrollInputIntoView" />
                    <v-btn :disabled="messageInput.length === 0" type="submit" class="ml-2" size="x-large" density="compact"
                        icon="mdi-arrow-up-thick" />
                </v-form>
            </div>
        </template>
    </main>
</template>

<style scoped>
.message {
    max-width: 70%;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 20px;
    overflow-wrap: anywhere;
}

.message.sent {
    background-color: #00897b;
    color: white;
    align-self: flex-end;
}

/* Style for messages from the other user */
.message.received {
    background-color: #681EE3;
    color: white;
    align-self: flex-start;
}

.text-input {
    position: relative;
    bottom: 0;
}
</style>
