const { FlatCompat } = require("@eslint/eslintrc")
const typescriptParser = require("@typescript-eslint/parser")
const typescriptPlugin = require("@typescript-eslint/eslint-plugin")
const vueParser = require("vue-eslint-parser")
const vuePlugin = require("eslint-plugin-vue")

const compat = new FlatCompat({
    baseDirectory: __dirname
});

const typescriptRules = {
    ...typescriptPlugin.configs["eslint-recommended"].rules,
    ...typescriptPlugin.configs["strict-type-checked"].rules,
    ...typescriptPlugin.configs["stylistic-type-checked"].rules
}

module.exports = [
    {
        files: ["**/*.ts"],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                project: ["./tsconfig.app.json", "./tsconfig.node.json"]
            }
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin
        },
        rules: {
            ...typescriptRules,
            eqeqeq: "error"
        }
    },
    {
        files: ["**/*.vue"],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: "@typescript-eslint/parser",
                project: ["./tsconfig.app.json"],
                extraFileExtensions: [".vue"]
            }
        },
        plugins: {
            vue: vuePlugin,
            "@typescript-eslint": typescriptPlugin
        },
        rules: {
            ...typescriptRules,
            ...vuePlugin.configs["vue3-essential"].rules,
            ...vuePlugin.configs["vue3-strongly-recommended"].rules,
            ...vuePlugin.configs["vue3-recommended"].rules,
            eqeqeq: "error"
        }
    }
]
