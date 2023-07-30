/* eslint-env node */
require("@rushstack/eslint-patch/modern-module-resolution");

module.exports = {
    "root": true,
    "extends": [
        "plugin:vue/vue3-essential",
        "eslint:recommended",
        "@vue/eslint-config-typescript"
    ],
    "parserOptions": {
        "ecmaVersion": "latest"
    },
    "rules": {
        "quotes": "error",
        "semi": "error",
        "quote-props": "error",
        "indent": [
            "error", 4
        ],
        "vue/script-indent": [
            "error", 4
        ],
        "vue/html-self-closing": 1
    }
};
