const vueParser = require("vue-eslint-parser")
const typescriptPlugin = require("@typescript-eslint/eslint-plugin")
const vuePlugin = require("eslint-plugin-vue")
const importPlugin = require("eslint-plugin-import")

module.exports = [
    {
        files: ["**/*.ts", "**/*.vue"],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: "@typescript-eslint/parser",
                tsconfigRootDir: __dirname,
                project: ["./tsconfig.app.json", "./tsconfig.node.json"],
                extraFileExtensions: [".vue"]
            }
        },
        plugins: {
            vue: vuePlugin,
            "@typescript-eslint": typescriptPlugin,
            import: importPlugin
        },
        rules: {
            ...typescriptPlugin.configs["eslint-recommended"].rules,
            ...typescriptPlugin.configs["strict-type-checked"].rules,
            ...typescriptPlugin.configs["stylistic-type-checked"].rules,
            ...vuePlugin.configs["vue3-essential"].rules,
            ...vuePlugin.configs["vue3-strongly-recommended"].rules,
            ...vuePlugin.configs["vue3-recommended"].rules,
            "vue/html-indent": "off",
            "vue/max-attributes-per-line": "off",
            "vue/singleline-html-element-content-newline": "off",
            "vue/first-attribute-linebreak": "off",
            "vue/html-closing-bracket-newline": "off",
            "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],
            eqeqeq: "error",
            "import/order": "error",
            "import/consistent-type-specifier-style": ["error", "prefer-inline"]
        }
    }
]
