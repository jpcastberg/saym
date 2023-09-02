import "./assets/main.css";
import "@mdi/font/css/materialdesignicons.css";

import { createApp, type Component } from "vue";
import { createPinia } from "pinia";
import "vuetify/styles";
import { createVuetify, type ThemeDefinition } from "vuetify";
import { md2 } from "vuetify/blueprints";
import { aliases, mdi } from "vuetify/iconsets/mdi";

import App from "./App.vue";
import router from "./router";

const app = createApp(App as Component);

const myCustomLightTheme: ThemeDefinition = {
    dark: false,
    colors: {
        background: "#FFFFFF",
        surface: "#FFFFFF",
        primary: "#6200EE",
        "primary-darken-1": "#3700B3",
        secondary: "#03DAC6",
        "secondary-darken-1": "#018786",
        error: "#B00020",
        info: "#2196F3",
        success: "#4CAF50",
        warning: "#FB8C00",
    },
};

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
