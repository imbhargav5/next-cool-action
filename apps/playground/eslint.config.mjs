import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
	{
		ignores: [".next/**", "node_modules/**"],
	},
	{
		plugins: {
			"@next/next": nextPlugin,
			react: reactPlugin,
			"react-hooks": reactHooksPlugin,
		},
		rules: {
			...nextPlugin.configs.recommended.rules,
			...nextPlugin.configs["core-web-vitals"].rules,
		},
	},
];
