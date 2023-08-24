<script setup lang="ts">
import { useAppStore } from '../stores/app';
const appStore = useAppStore();
</script>

<template>
    <v-dialog v-model="appStore.shouldShowAboutDialog">
        <v-card>
            <v-card-item>
                <v-card-title>
                    About
                </v-card-title>
            </v-card-item>
            <v-card-text>
                Made by John Castberg, for his mother, Lorraine. Love you mom!
            </v-card-text>
            <v-card-text>
                Regardless if you are my mom or not, please let me know if you find a bug, or have a feature request.
            </v-card-text>
            <v-card-actions>
                <a href="mailto:jpcastberg@gmail.com">
                    <v-btn aria-label="Email" class="ml-2" size="x-large" density="compact" icon="mdi-email" />
                </a>
                <a href="https://github.com/jpcastberg/saym" target="_blank noopener noreferrer">
                    <v-btn aria-label="Github" class="ml-2" size="x-large" density="compact" icon="mdi-github" />
                </a>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>
