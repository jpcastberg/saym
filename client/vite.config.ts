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
        VitePWA({
            injectRegister: "auto",
            registerType: "autoUpdate",
            manifest: {
                name: "Saym",
                short_name: "Saym",
                description: "A word guessing game for you and your friends",
                theme_color: "#00897b",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
            devOptions: {
                enabled: true,
            },
        }),
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
