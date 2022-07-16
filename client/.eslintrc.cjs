/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
    "root": true,
    "extends": [
        "plugin:vue/vue3-recommended",
        "eslint:recommended",
        "@vue/eslint-config-typescript/recommended",
    ],
    "rules": {
        "quotes": "error",
        "semi": "error",
        "quote-props": "error",
        "indent": [
            "error", 4
        ],
        "vue/html-indent": [
            "error", 4
        ],
        "vue/script-indent": [
            "error", 4
        ],
        "vue/html-self-closing": false
    }
};
