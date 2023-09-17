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
