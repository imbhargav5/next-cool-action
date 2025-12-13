import { CoolActionClient } from "./cool-action-client";
import type { CreateClientOpts, DVES, HandleServerErrorFn } from "./index.types";
import type { InferOutputOrDefault, StandardSchemaV1 } from "./standard-schema";
import { DEFAULT_SERVER_ERROR_MESSAGE } from "./utils";
import { flattenValidationErrors, formatValidationErrors } from "./validation-errors";

export { createMiddleware } from "./middleware";
export { DEFAULT_SERVER_ERROR_MESSAGE } from "./utils";
export {
    ActionBindArgsValidationError,
    ActionMetadataValidationError,
    ActionOutputDataValidationError,
    ActionValidationError,
    flattenValidationErrors,
    formatValidationErrors,
    returnValidationErrors
} from "./validation-errors";

export type * from "./index.types";
export type * from "./validation-errors.types";

/**
 * Create a new cool action client.
 * Note: this client only works with Zod as the validation library.
 * @param createOpts Initialization options
 *
 * {@link https://next-cool-action.dev/docs/define-actions/create-the-client#initialization-options See docs for more information}
 */
export const createCoolActionClient = <
	ODVES extends DVES | undefined = undefined,
	ServerError = string,
	MetadataSchema extends StandardSchemaV1 | undefined = undefined,
>(
	createOpts?: CreateClientOpts<ODVES, ServerError, MetadataSchema>
) => {
	// If `handleServerError` is provided, use it, otherwise default to log to console and generic error message.
	const handleServerError: HandleServerErrorFn<ServerError, MetadataSchema> =
		createOpts?.handleServerError ||
		((e) => {
			console.error("Action error:", e.message);
			return DEFAULT_SERVER_ERROR_MESSAGE as ServerError;
		});

	return new CoolActionClient<
		ServerError,
		ODVES,
		MetadataSchema,
		InferOutputOrDefault<MetadataSchema, undefined>,
		MetadataSchema extends undefined ? true : false,
		{}, // Ctx
		undefined, // ISF
		undefined, // IS - explicitly undefined at initialization
		undefined, // OS
		[], // BAS
		undefined // CVE
	>({
		middlewareFns: [async ({ next }) => next({ ctx: {} })],
		handleServerError,
		inputSchemaFn: undefined,
		bindArgsSchemas: [],
		outputSchema: undefined,
		ctxType: {},
		metadataSchema: (createOpts?.defineMetadataSchema?.() ?? undefined) as MetadataSchema,
		metadata: undefined as InferOutputOrDefault<MetadataSchema, undefined>,
		defaultValidationErrorsShape: (createOpts?.defaultValidationErrorsShape ?? "formatted") as ODVES,
		throwValidationErrors: Boolean(createOpts?.throwValidationErrors),
		handleValidationErrorsShape: (async (ve: any) =>
			createOpts?.defaultValidationErrorsShape === "flattened"
				? flattenValidationErrors(ve)
				: formatValidationErrors(ve)) as never,
	});
};
