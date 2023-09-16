const vueParser = require("vue-eslint-parser")
const typescriptPlugin = require("@typescript-eslint/eslint-plugin")
const vuePlugin = require("eslint-plugin-vue")
const importPlugin = require("eslint-plugin-import")
const jestPlugin = require("eslint-plugin-jest");

const typescriptRules = {
    ...typescriptPlugin.configs["eslint-recommended"].rules,
    ...typescriptPlugin.configs["strict-type-checked"].rules,
    ...typescriptPlugin.configs["stylistic-type-checked"].rules,
    "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": false }],
    "@typescript-eslint/no-non-null-assertion": "off",
};

const vueRules = {
    ...vuePlugin.configs["vue3-essential"].rules,
    ...vuePlugin.configs["vue3-strongly-recommended"].rules,
    ...vuePlugin.configs["vue3-recommended"].rules,
    "vue/first-attribute-linebreak": "off",
    "vue/html-closing-bracket-newline": "off",
    "vue/html-indent": "off",
    "vue/max-attributes-per-line": "off",
    "vue/singleline-html-element-content-newline": "off",
};

const importRules = {
    "import/consistent-type-specifier-style": ["error", "prefer-inline"],
    "import/order": "error"
};

const jestRules = {
    ...jestPlugin.configs.all.rules,
    "jest/max-expects": "off",
    "jest/prefer-expect-assertions": "off",
    "jest/no-hooks": "off",
    "jest/require-top-level-describe": "off"
};

const eslintRules = {
    eqeqeq: "error",
    semi: "error",
};

const parserOptions = {
    parser: "@typescript-eslint/parser",
    extraFileExtensions: [".vue"],
    project: ["./tsconfig.app.json", "./tsconfig.node.json"],
    tsconfigRootDir: __dirname,
};

module.exports = [
    {
        files: ["**/*.vue", "**/*.ts"],
        languageOptions: {
            parser: vueParser,
            parserOptions,
        },
        plugins: {
            "@typescript-eslint": typescriptPlugin,
            import: importPlugin,
            vue: vuePlugin,
        },
        rules: {
            ...typescriptRules,
            ...vueRules,
            ...importRules,
            ...eslintRules
        }
    },
    {
        files: ["**/*.test.ts"],
        languageOptions: {
            parser: vueParser,
            parserOptions,
        },
        plugins: {
            jest: jestPlugin,
            "@typescript-eslint": typescriptPlugin,
            import: importPlugin,
        },
        rules: {
            ...jestRules,
            ...typescriptRules,
            ...importRules,
            ...eslintRules
        }
    }
]
