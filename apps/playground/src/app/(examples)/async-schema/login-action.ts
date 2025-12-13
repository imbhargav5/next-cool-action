"use server";

import { action } from "@/lib/cool-action";
import { flattenValidationErrors, returnValidationErrors } from "next-cool-action";
import { z } from "zod";

const schema = z.object({
	username: z.string().min(3).max(10),
	password: z.string().min(8).max(100),
});

async function getSchema() {
	return schema;
}

export const loginUser = action
	.metadata({ actionName: "loginUser" })
	.inputSchema(getSchema, {
		// Here we use the `flattenValidationErrors` function to customize the returned validation errors
		// object to the client.
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		handleValidationErrorsShape: async (ve: any) => flattenValidationErrors(ve).fieldErrors,
	})
	.action(
		async ({ parsedInput: { username, password } }) => {
			if (username === "johndoe") {
				returnValidationErrors(schema, {
					username: {
						_errors: ["user_suspended"],
					},
				});
			}

			if (username === "user" && password === "password") {
				return {
					success: true,
				};
			}

			returnValidationErrors(schema, {
				username: {
					_errors: ["incorrect_credentials"],
				},
			});
		},
		{}
	);
