module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        "project": "./tsconfig.json"
    },
    env: {
        "node": true
    },
    plugins: [
        "@typescript-eslint"
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/stylistic-type-checked"
    ],
    rules: {
        eqeqeq: "error"
    }
}
