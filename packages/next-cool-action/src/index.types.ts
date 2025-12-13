import type { CoolActionClient } from "./cool-action-client";
import type {
    InferInputArray,
    InferInputOrDefault,
    InferOutputArray,
    InferOutputOrDefault,
    StandardSchemaV1,
} from "./standard-schema";
import type { MaybePromise, Prettify } from "./utils.types";
import type { HandleValidationErrorsShapeFn, ValidationErrors } from "./validation-errors.types";

/**
 * Type of the default validation errors shape passed to `createCoolActionClient` via `defaultValidationErrorsShape`
 * property.
 */
export type DVES = "formatted" | "flattened";

/**
 * Type of the util properties passed to server error handler functions.
 */
export type ServerErrorFunctionUtils<MetadataSchema extends StandardSchemaV1 | undefined> = {
	clientInput: unknown;
	bindArgsClientInputs: unknown[];
	ctx: object;
	metadata: InferOutputOrDefault<MetadataSchema, undefined>;
};

export type HandleServerErrorFn<
	ServerError = string,
	MetadataSchema extends StandardSchemaV1 | undefined = undefined,
> = (error: Error, utils: ServerErrorFunctionUtils<MetadataSchema>) => MaybePromise<ServerError>;

/**
 * Type of the arguments passed to the `CoolActionClient` constructor.
 */
export type CoolActionClientArgs<
	ServerError,
	ODVES extends DVES | undefined, // override default validation errors shape
	MetadataSchema extends StandardSchemaV1 | undefined = undefined,
	MD = InferOutputOrDefault<MetadataSchema, undefined>, // metadata type (inferred from metadata schema)
	MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
	Ctx extends object = {},
	ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined, // input schema function
	IS extends StandardSchemaV1 | undefined = undefined, // input schema - independent, not derived from ISF
	OS extends StandardSchemaV1 | undefined = undefined, // output schema
	BAS extends readonly StandardSchemaV1[] = [], // bind args schemas
	CVE = undefined, // custom validation errors shape
> = {
	middlewareFns: MiddlewareFn<ServerError, any, any, any>[];
	metadataSchema: MetadataSchema;
	metadata: MD;
	metadataProvided?: MDProvided;
	inputSchemaFn: ISF;
	outputSchema: OS;
	bindArgsSchemas: BAS;
	handleValidationErrorsShape: HandleValidationErrorsShapeFn<IS, BAS, MD, Ctx, CVE>;
	ctxType: Ctx;
	handleServerError: HandleServerErrorFn<ServerError, MetadataSchema>;
	defaultValidationErrorsShape: ODVES;
	throwValidationErrors: boolean;
};

/**
 * Type of options when creating a new cool action client.
 */
export type CreateClientOpts<
	ODVES extends DVES | undefined = undefined,
	ServerError = string,
	MetadataSchema extends StandardSchemaV1 | undefined = undefined,
> = {
	defineMetadataSchema?: () => MetadataSchema;
	handleServerError?: HandleServerErrorFn<ServerError, MetadataSchema>;
	defaultValidationErrorsShape?: ODVES;
	throwValidationErrors?: boolean;
};

/**
 * Type of the result of a cool action.
 */
export type CoolActionResult<
	ServerError,
	S extends StandardSchemaV1 | undefined,
	CVE = ValidationErrors<S>,
	Data = unknown,
	// eslint-disable-next-line
	NextCtx = object,
> = {
	data?: Data;
	serverError?: ServerError;
	validationErrors?: CVE;
};

/**
 * Type of the function called from components with type safe input data.
 */
export type CoolActionFn<
	ServerError,
	S extends StandardSchemaV1 | undefined,
	BAS extends readonly StandardSchemaV1[],
	CVE,
	Data,
> = (
	...clientInputs: [...bindArgsInputs: InferInputArray<BAS>, input: InferInputOrDefault<S, void>]
) => Promise<CoolActionResult<ServerError, S, CVE, Data>>;

/**
 * Type of the stateful function called from components with type safe input data.
 */
export type CoolStateActionFn<
	ServerError,
	S extends StandardSchemaV1 | undefined,
	BAS extends readonly StandardSchemaV1[],
	CVE,
	Data,
> = (
	...clientInputs: [
		...bindArgsInputs: InferInputArray<BAS>,
		prevResult: Prettify<CoolActionResult<ServerError, S, CVE, Data>>,
		input: InferInputOrDefault<S, void>,
	]
) => Promise<CoolActionResult<ServerError, S, CVE, Data>>;

/**
 * Type of the result of a middleware function. It extends the result of a cool action with
 * information about the action execution.
 */
export type MiddlewareResult<ServerError, NextCtx extends object> = CoolActionResult<
	ServerError,
	any,
	any,
	any,
	NextCtx
> & {
	navigationKind?: NavigationKind;
	parsedInput?: unknown;
	bindArgsParsedInputs?: unknown[];
	ctx?: object;
	success: boolean;
};

/**
 * Type of the middleware function passed to a cool action client.
 */
export type MiddlewareFn<ServerError, MD, Ctx extends object, NextCtx extends object> = {
	(opts: {
		clientInput: unknown;
		bindArgsClientInputs: unknown[];
		ctx: Prettify<Ctx>;
		metadata: MD;
		next: {
			<NC extends object = {}>(opts?: { ctx?: NC }): Promise<MiddlewareResult<ServerError, NC>>;
		};
	}): Promise<MiddlewareResult<ServerError, NextCtx>>;
};

/**
 * Type of the function that executes server code when defining a new cool action.
 */
export type ServerCodeFn<
	MD,
	Ctx extends object,
	S extends StandardSchemaV1 | undefined,
	BAS extends readonly StandardSchemaV1[],
	Data,
> = (args: {
	parsedInput: InferOutputOrDefault<S, undefined>;
	clientInput: InferInputOrDefault<S, undefined>;
	bindArgsParsedInputs: InferOutputArray<BAS>;
	bindArgsClientInputs: InferInputArray<BAS>;
	ctx: Prettify<Ctx>;
	metadata: MD;
}) => Promise<Data>;

/**
 * Type of the function that executes server code when defining a new stateful cool action.
 */
export type StateServerCodeFn<
	ServerError,
	MD,
	Ctx extends object,
	S extends StandardSchemaV1 | undefined,
	BAS extends readonly StandardSchemaV1[],
	CVE,
	Data,
> = (
	args: {
		parsedInput: InferOutputOrDefault<S, undefined>;
		clientInput: InferInputOrDefault<S, undefined>;
		bindArgsParsedInputs: InferOutputArray<BAS>;
		bindArgsClientInputs: InferInputArray<BAS>;
		ctx: Prettify<Ctx>;
		metadata: MD;
	},
	utils: { prevResult: Prettify<CoolActionResult<ServerError, S, CVE, Data>> }
) => Promise<Data>;

/**
 * Possible types of navigation.
 */
export type NavigationKind = "redirect" | "notFound" | "forbidden" | "unauthorized" | "other";

/**
 * Type of action execution utils. It includes action callbacks and other utils.
 */
export type CoolActionUtils<
	ServerError,
	MD,
	Ctx extends object,
	S extends StandardSchemaV1 | undefined,
	BAS extends readonly StandardSchemaV1[],
	CVE,
	Data,
> = {
	throwServerError?: boolean;
	throwValidationErrors?: boolean | { overrideErrorMessage: (validationErrors: CVE) => Promise<string> };
	onSuccess?: (args: {
		data?: Data;
		metadata: MD;
		ctx?: Prettify<Ctx>;
		clientInput: InferInputOrDefault<S, undefined>;
		bindArgsClientInputs: InferInputArray<BAS>;
		parsedInput: InferOutputOrDefault<S, undefined>;
		bindArgsParsedInputs: InferOutputArray<BAS>;
	}) => Promise<unknown>;
	onNavigation?: (args: {
		metadata: MD;
		ctx?: Prettify<Ctx>;
		clientInput: InferInputOrDefault<S, undefined>;
		bindArgsClientInputs: InferInputArray<BAS>;
		navigationKind: NavigationKind;
	}) => Promise<unknown>;
	onError?: (args: {
		error: Prettify<Omit<CoolActionResult<ServerError, S, CVE, Data>, "data">>;
		metadata: MD;
		ctx?: Prettify<Ctx>;
		clientInput: InferInputOrDefault<S, undefined>;
		bindArgsClientInputs: InferInputArray<BAS>;
	}) => Promise<unknown>;
	onSettled?: (args: {
		result: Prettify<CoolActionResult<ServerError, S, CVE, Data>>;
		metadata: MD;
		ctx?: Prettify<Ctx>;
		clientInput: InferInputOrDefault<S, undefined>;
		bindArgsClientInputs: InferInputArray<BAS>;
		navigationKind?: NavigationKind;
	}) => Promise<unknown>;
};

/**
 * Infer input types of a cool action.
 */
export type InferCoolActionFnInput<T extends Function> = T extends
	| CoolActionFn<
			any,
			infer S extends StandardSchemaV1 | undefined,
			infer BAS extends readonly StandardSchemaV1[],
			any,
			any
	  >
	| CoolStateActionFn<
			any,
			infer S extends StandardSchemaV1 | undefined,
			infer BAS extends readonly StandardSchemaV1[],
			any,
			any
	  >
	? S extends StandardSchemaV1
		? {
				clientInput: StandardSchemaV1.InferInput<S>;
				bindArgsClientInputs: InferInputArray<BAS>;
				parsedInput: StandardSchemaV1.InferOutput<S>;
				bindArgsParsedInputs: InferOutputArray<BAS>;
			}
		: {
				clientInput: undefined;
				bindArgsClientInputs: InferInputArray<BAS>;
				parsedInput: undefined;
				bindArgsParsedInputs: InferOutputArray<BAS>;
			}
	: never;

/**
 * Infer the result type of a cool action.
 */
export type InferCoolActionFnResult<T extends Function> = T extends
	| CoolActionFn<infer ServerError, infer S extends StandardSchemaV1 | undefined, any, infer CVE, infer Data>
	| CoolStateActionFn<infer ServerError, infer S extends StandardSchemaV1 | undefined, any, infer CVE, infer Data>
	? CoolActionResult<ServerError, S, CVE, Data>
	: never;

/**
 * Infer the next context type returned by a middleware function using the `next` function.
 */
export type InferMiddlewareFnNextCtx<T> =
	T extends MiddlewareFn<any, any, any, infer NextCtx extends object> ? NextCtx : never;

/**
 * Infer the context type of a cool action client or middleware function.
 */
export type InferCtx<T> = T extends
	| CoolActionClient<any, any, any, any, false, infer Ctx extends object, any, any, any, any, any>
	| MiddlewareFn<any, any, infer Ctx extends object, any>
	? Ctx
	: never;

/**
 * Infer the metadata type of a cool action client or middleware function.
 */
export type InferMetadata<T> = T extends
	| CoolActionClient<any, any, any, infer MD, false, any, any, any, any, any, any>
	| MiddlewareFn<any, infer MD, any, any>
	? MD
	: never;

/**
 * Infer the server error type from a cool action client or a middleware function or a cool action function.
 */
export type InferServerError<T> = T extends
	| CoolActionClient<infer ServerError, any, any, any, any, any, any, any, any, any, any>
	| MiddlewareFn<infer ServerError, any, any, any>
	| CoolActionFn<infer ServerError, any, any, any, any>
	| CoolStateActionFn<infer ServerError, any, any, any, any>
	? ServerError
	: never;

/**
 * Type of the core cool action client.
 */
export { CoolActionClient };
