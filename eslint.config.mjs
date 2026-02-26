import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
	js.configs.recommended,
	...tseslint.configs.recommended,
	prettier,
	{
		ignores: ["main.js", "node_modules/", "*.mjs"],
	},
	{
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
			"no-console": ["warn", { allow: ["error", "warn"] }],
			"@typescript-eslint/use-unknown-in-catch-callback-variable": "off",
			"@typescript-eslint/only-throw-error": "off",
			"preserve-caught-error": "off",
		},
	},
);
