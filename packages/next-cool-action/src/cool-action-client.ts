import { actionBuilder } from "./action-builder";
import type {
    CoolActionClientArgs,
    CoolActionUtils,
    DVES,
    MiddlewareFn,
    ServerCodeFn,
    StateServerCodeFn,
} from "./index.types";
import type { InferOutputOrDefault, StandardSchemaV1 } from "./standard-schema";
import type {
    FlattenedValidationErrors,
    HandleValidationErrorsShapeFn,
    ValidationErrors,
} from "./validation-errors.types";

export class CoolActionClient<
	ServerError,
	ODVES extends DVES | undefined, // override default validation errors shape
	MetadataSchema extends StandardSchemaV1 | undefined = undefined,
	MD = InferOutputOrDefault<MetadataSchema, undefined>, // metadata type (inferred from metadata schema)
	MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
	Ctx extends object = {},
	ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined, // input schema function
	IS extends StandardSchemaV1 | undefined = undefined, // input schema - independent, not derived from ISF
	OS extends StandardSchemaV1 | undefined = undefined, // output schema
	const BAS extends readonly StandardSchemaV1[] = [],
	CVE = undefined,
> {
	readonly #args: CoolActionClientArgs<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, BAS, CVE>;

	constructor(
		args: CoolActionClientArgs<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, BAS, CVE>
	) {
		this.#args = args;
	}

	/**
	 * Use a middleware function.
	 * @param middlewareFn Middleware function
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/instance-methods#use See docs for more information}
	 */
	use<NextCtx extends object>(
		middlewareFn: MiddlewareFn<ServerError, MD, Ctx, Ctx & NextCtx>
	): CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx & NextCtx, ISF, IS, OS, BAS, CVE> {
		return new CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx & NextCtx, ISF, IS, OS, BAS, CVE>({
			...this.#args,
			middlewareFns: [...this.#args.middlewareFns, middlewareFn],
			ctxType: {} as Ctx & NextCtx,
		});
	}

	/**
	 * Define metadata for the action.
	 * @param data Metadata with the same type as the return value of the [`defineMetadataSchema`](https://next-cool-action.dev/docs/define-actions/create-the-client#definemetadataschema) optional initialization function
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/instance-methods#metadata See docs for more information}
	 */
	metadata(data: MD): CoolActionClient<ServerError, ODVES, MetadataSchema, MD, true, Ctx, ISF, IS, OS, BAS, CVE> {
		return new CoolActionClient<ServerError, ODVES, MetadataSchema, MD, true, Ctx, ISF, IS, OS, BAS, CVE>({
			...this.#args,
			metadata: data,
			metadataProvided: true,
		});
	}

	/**
	 * Define the input validation schema for the action.
	 * @param inputSchema Input validation schema
	 * @param utils Optional utils object
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/create-the-client#inputschema See docs for more information}
	 */
	inputSchema<
		OIS extends StandardSchemaV1 | ((prevSchema: IS) => Promise<StandardSchemaV1>), // override input schema
		AIS extends StandardSchemaV1 = OIS extends (prevSchema: IS) => Promise<StandardSchemaV1> // actual input schema
			? Awaited<ReturnType<OIS>>
			: OIS extends StandardSchemaV1
				? OIS
				: never,
		// override custom validation errors shape
		OCVE = ODVES extends "flattened" ? FlattenedValidationErrors<ValidationErrors<AIS>> : ValidationErrors<AIS>,
	>(
		inputSchema: OIS,
		utils?: {
			handleValidationErrorsShape?: HandleValidationErrorsShapeFn<AIS, BAS, MD, Ctx, OCVE>;
		}
	): CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, () => Promise<AIS>, AIS, OS, BAS, OCVE> {
		const newInputSchemaFn = ((inputSchema as unknown as { [Symbol.toStringTag]?: string })[Symbol.toStringTag] === "AsyncFunction"
			? async () => {
					const prevSchema = await this.#args.inputSchemaFn?.();
					return (inputSchema as (prevSchema: IS) => Promise<StandardSchemaV1>)(prevSchema as IS);
				}
			: async () => inputSchema) as () => Promise<AIS>;

		return new CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, () => Promise<AIS>, AIS, OS, BAS, OCVE>({
			...this.#args,
			inputSchemaFn: newInputSchemaFn,
			handleValidationErrorsShape: (utils?.handleValidationErrorsShape ??
				this.#args.handleValidationErrorsShape) as HandleValidationErrorsShapeFn<AIS, BAS, MD, Ctx, OCVE>,
		});
	}

	/**
	 * Define the bind args input validation schema for the action.
	 * @param bindArgsSchemas Bind args input validation schemas
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/instance-methods#bindargsschemas See docs for more information}
	 */
	bindArgsSchemas<const OBAS extends readonly StandardSchemaV1[]>(
		bindArgsSchemas: OBAS
	): CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, OBAS, CVE> {
		return new CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, OBAS, CVE>({
			...this.#args,
			bindArgsSchemas,
			handleValidationErrorsShape: this.#args.handleValidationErrorsShape as unknown as HandleValidationErrorsShapeFn<
				IS,
				OBAS,
				MD,
				Ctx,
				CVE
			>,
		});
	}

	/**
	 * Define the output data validation schema for the action.
	 * @param schema Output data validation schema
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/create-the-client#outputschema See docs for more information}
	 */
	outputSchema<OOS extends StandardSchemaV1>(
		dataSchema: OOS
	): CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OOS, BAS, CVE> {
		return new CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OOS, BAS, CVE>({
			...this.#args,
			outputSchema: dataSchema,
		});
	}

	/**
	 * Define the action.
	 * @param serverCodeFn Code that will be executed on the **server side**
	 * @param [cb] Optional callbacks that will be called after action execution, on the server.
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/instance-methods#action--stateaction See docs for more information}
	 */
	action<Data extends InferOutputOrDefault<OS, any>>(
		this: MDProvided extends true
			? CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, BAS, CVE>
			: never,
		serverCodeFn: ServerCodeFn<MD, Ctx, IS, BAS, Data>,
		utils?: CoolActionUtils<ServerError, MD, Ctx, IS, BAS, CVE, Data>
	) {
		return actionBuilder(this.#args).action(serverCodeFn, utils);
	}

	/**
	 * Define the stateful action.
	 * To be used with React's `useActionState` hook.
	 * @param serverCodeFn Code that will be executed on the **server side**
	 * @param [cb] Optional callbacks that will be called after action execution, on the server.
	 *
	 * {@link https://next-cool-action.dev/docs/define-actions/instance-methods#action--stateaction See docs for more information}
	 */
	stateAction<Data extends InferOutputOrDefault<OS, any>>(
		this: MDProvided extends true
			? CoolActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, BAS, CVE>
			: never,
		serverCodeFn: StateServerCodeFn<ServerError, MD, Ctx, IS, BAS, CVE, Data>,
		utils?: CoolActionUtils<ServerError, MD, Ctx, IS, BAS, CVE, Data>
	) {
		return actionBuilder(this.#args).stateAction(serverCodeFn, utils);
	}
}
