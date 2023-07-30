import "./assets/main.css";
import "@mdi/font/css/materialdesignicons.css";

import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import { aliases, mdi } from "vuetify/iconsets/mdi";

const app = createApp(App);

app.use(createVuetify({
    "icons": {
        "defaultSet": "mdi",
        aliases,
        "sets": {
            mdi,
        },
    },
}));
app.use(createPinia());
app.use(router);

app.mount("#app");
