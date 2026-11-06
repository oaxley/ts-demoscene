import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            library: path.resolve(__dirname, "files/library"),
        },
    },
    test: {
        include: ["tests/**/*.test.ts"],
        setupFiles: ["tests/setup.ts"],
        environment: "node",
        testTimeout: 120_000,
    },
});
