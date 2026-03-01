import js from "@eslint/js";
import tseslint from "typescript-eslint";
import tsparser from "@typescript-eslint/parser";
import obsidianmd from "eslint-plugin-obsidianmd";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	...obsidianmd.configs.recommended,
	prettier,
	{
		ignores: ["main.js", "node_modules/", "*.mjs"],
	},
	{
		files: ["**/*.ts"],
		languageOptions: {
			parser: tsparser,
			parserOptions: { project: "./tsconfig.json" },
			globals: {
				window: "readonly",
				console: "readonly",
				setTimeout: "readonly",
				clearTimeout: "readonly",
				document: "readonly",
				HTMLElement: "readonly",
				HTMLInputElement: "readonly",
				HTMLTextAreaElement: "readonly",
				HTMLButtonElement: "readonly",
			},
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"no-console": ["warn", { allow: ["error", "warn"] }],
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
			"@typescript-eslint/only-throw-error": "off",

			// obsidianmd rules
			"obsidianmd/sample-names": "off",
			"obsidianmd/prefer-file-manager-trash-file": "error",
		},
	},
);
