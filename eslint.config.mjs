import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import ts from "typescript-eslint";

export default [
    {
        ignores: ["out/**", "dist/**", "**/*.d.ts"],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    {
        plugins: {
            "@stylistic": stylistic,
        },
        languageOptions: {
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
        rules: {
            "@typescript-eslint/naming-convention": "warn",
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^",
                    varsIgnorePattern: "^",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            semi: "off",
            "@stylistic/semi": ["warn", "always"],
            curly: "warn",
            eqeqeq: "warn",
            "no-throw-literal": "warn",
        },
    },
];
