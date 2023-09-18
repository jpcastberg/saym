import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";
import vuetify from "vite-plugin-vuetify";
import { VitePWA } from "vite-plugin-pwa";
import manifest from "./manifest.json";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        vuetify({ autoImport: true }),
        VitePWA({
            strategies: "injectManifest",
            injectRegister: "auto",
            registerType: "autoUpdate",
            srcDir: "src",
            filename: "serviceWorker.ts",
            manifest,
            devOptions: {
                enabled: true,
                type: "module",
            },
        }),
    ],
    server: {
        host: true,
        proxy: {
            "^/api/.*": "http://localhost:7296",
            "^/websocket/?.*": {
                target: "ws://localhost:7296",
                ws: true,
            },
        },
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        sourcemap: true,
    },
});
