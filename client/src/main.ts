import "./assets/main.css";
import "@mdi/font/css/materialdesignicons.css";

import { createApp, type Component } from "vue";
import { createPinia } from "pinia";
import "vuetify/styles";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";

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
