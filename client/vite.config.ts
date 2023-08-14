import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vuetify from "vite-plugin-vuetify";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        vuetify({ autoImport: true }),
        VitePWA({ registerType: "autoUpdate" }),
    ],
    server: {
        host: true,
        proxy: {
            "^/api/.*": "http://localhost:3000",
            "^/websocket/?.*": {
                target: "ws://localhost:3000",
                ws: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
});
