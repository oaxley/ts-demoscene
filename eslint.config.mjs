// ESLint flat configuration
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
    {
        ignores: ["public/**", "node_modules/**", "types/**", "tmp/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            // existing code base: report, don't block
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-namespace": "off",
            "prefer-const": "warn",
            // TODO(cleanup phases): promote back to "error" once fixed
            "no-var": "warn",
            "no-useless-assignment": "warn",
            "@typescript-eslint/no-wrapper-object-types": "warn",
        },
    },
);
