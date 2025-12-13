"use server";

import { action } from "@/lib/cool-action";
import { returnValidationErrors } from "next-cool-action";
import { loginSchema } from "./validation";

export const loginAction = action
	.metadata({ actionName: "loginAction" })
	.inputSchema(loginSchema)
	.action(async ({ parsedInput }) => {
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Demo: Only "admin" / "password" works
		if (parsedInput.username !== "admin" || parsedInput.password !== "password") {
			returnValidationErrors(loginSchema, {
				_errors: ["Invalid username or password"],
				username: {
					_errors: ["Invalid username"],
				},
				password: {
					_errors: ["Invalid password"],
				},
			});
		}

		return {
			successful: true,
			username: parsedInput.username,
		};
	});

