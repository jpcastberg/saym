import "maz-ui/css/main.css";
import "./assets/main.css";
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";

import { createApp, type Component } from "vue";
import { createPinia } from "pinia";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import { registerSW } from "virtual:pwa-register";

import App from "./App.vue";
import router from "./router";

const app = createApp(App as Component);

app.use(
    createVuetify({
        icons: {
            defaultSet: "mdi",
            aliases,
            sets: {
                mdi,
            },
        },
        theme: {
            defaultTheme: "dark",
        },
    }),
);
app.use(createPinia());
app.use(router);

app.mount("#app");

if (import.meta.env.DEV) {
    // @ts-expect-error adding properties to support vue devtools on non vue-y browsers
    window.__VUE_DEVTOOLS_HOST__ = "vue-devtools.castberg.media"; // default: localhost
    // @ts-expect-error same as above
    window.__VUE_DEVTOOLS_PORT__ = "443"; // default: 8098
    const script = document.createElement("script");
    script.src = "https://vue-devtools.castberg.media:443";
    document.head.appendChild(script);
}

registerSW({ immediate: true });

registerSW({
    onRegistered(registration) {
        if (!registration) {
            return;
        }
        setInterval(
            () => {
                void registration.update();
            },
            60 * 60 * 1000,
        );
    },
});
