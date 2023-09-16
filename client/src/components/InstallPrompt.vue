<script setup lang="ts">
import { ref } from "vue";
import UAParser from "ua-parser-js";
const userAgent = new UAParser();
const isIos = userAgent.getOS().name === "iOS";
const isMobileSafari = /^Mobile Safari$/.test(userAgent.getBrowser().name!);
const isInStandaloneMode: boolean = ("standalone" in navigator && navigator.standalone as boolean);
const alertModel = ref(true);
const shouldDisplay = ref(isIos && !isInStandaloneMode);
</script>

<template>
    <div class="mb-4">
        <v-alert v-if="shouldDisplay" v-model="alertModel" class="text-center" closable>
            <template v-if="isMobileSafari">
                Install this webapp on your iPhone:
                <br>
                tap <v-icon>mdi-export-variant</v-icon> below, then "Add to Home Screen"
            </template>
            <template v-else>
                This webapp is best viewed in the Safari app. Open it there for further instructions!
            </template>
        </v-alert>
    </div>
</template>
