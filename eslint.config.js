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
                extraFileExtensions: [".vue"],
                parser: "@typescript-eslint/parser",
                project: ["./tsconfig.app.json", "./tsconfig.node.json"],
                tsconfigRootDir: __dirname,
            }
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
            import: importPlugin,
            vue: vuePlugin,
        },
        rules: {
            ...typescriptPlugin.configs["eslint-recommended"].rules,
            ...typescriptPlugin.configs["strict-type-checked"].rules,
            ...typescriptPlugin.configs["stylistic-type-checked"].rules,
            ...vuePlugin.configs["vue3-essential"].rules,
            ...vuePlugin.configs["vue3-strongly-recommended"].rules,
            ...vuePlugin.configs["vue3-recommended"].rules,
            "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],
            "@typescript-eslint/no-non-null-assertion": "off",
            "import/consistent-type-specifier-style": ["error", "prefer-inline"],
            "import/order": "error",
            "vue/first-attribute-linebreak": "off",
            "vue/html-closing-bracket-newline": "off",
            "vue/html-indent": "off",
            "vue/max-attributes-per-line": "off",
            "vue/singleline-html-element-content-newline": "off",
            eqeqeq: "error",
            semi: "error",
        }
    }
]
