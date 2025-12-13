import type { CoolActionFn, CoolActionResult, NavigationKind } from "./index.types";
import type { InferInputOrDefault, StandardSchemaV1 } from "./standard-schema";
import type { MaybePromise, Prettify } from "./utils.types";

/**
 * Type of hooks callbacks. These are executed when action is in a specific state.
 */
export type HookCallbacks<ServerError, S extends StandardSchemaV1 | undefined, CVE, Data> = {
	onExecute?: (args: { input: InferInputOrDefault<S, undefined> }) => MaybePromise<unknown>;
	onSuccess?: (args: { data: Data; input: InferInputOrDefault<S, undefined> }) => MaybePromise<unknown>;
	onError?: (args: {
		error: Prettify<Omit<CoolActionResult<ServerError, S, CVE, Data>, "data">> & { thrownError?: Error };
		input: InferInputOrDefault<S, undefined>;
	}) => MaybePromise<unknown>;
	onNavigation?: (args: {
		input: InferInputOrDefault<S, undefined>;
		navigationKind: NavigationKind;
	}) => MaybePromise<unknown>;
	onSettled?: (args: {
		result: Prettify<CoolActionResult<ServerError, S, CVE, Data>>;
		input: InferInputOrDefault<S, undefined>;
		navigationKind?: NavigationKind;
	}) => MaybePromise<unknown>;
};

/**
 * Type of the cool action function passed to hooks. Same as `CoolActionFn` except it accepts
 * just a single input, without bind arguments.
 */
export type HookCoolActionFn<ServerError, S extends StandardSchemaV1 | undefined, CVE, Data> = (
	input: InferInputOrDefault<S, undefined>
) => Promise<CoolActionResult<ServerError, S, CVE, Data>>;

/**
 * Type of the action status returned by `useAction` and `useOptimisticAction` hooks.
 */
export type HookActionStatus = "idle" | "executing" | "transitioning" | "hasSucceeded" | "hasErrored" | "hasNavigated";

/**
 * Type of the shorthand status object returned by `useAction` and `useOptimisticAction` hooks.
 */
export type HookShorthandStatus = {
	isIdle: boolean;
	isExecuting: boolean;
	isTransitioning: boolean;
	isPending: boolean;
	hasSucceeded: boolean;
	hasErrored: boolean;
	hasNavigated: boolean;
};

/**
 * Type of the return object of the `useAction` hook.
 */
export type UseActionHookReturn<ServerError, S extends StandardSchemaV1 | undefined, CVE, Data> = {
	execute: (input: InferInputOrDefault<S, void>) => void;
	executeAsync: (input: InferInputOrDefault<S, void>) => Promise<CoolActionResult<ServerError, S, CVE, Data>>;
	input: InferInputOrDefault<S, undefined>;
	result: Prettify<CoolActionResult<ServerError, S, CVE, Data>>;
	reset: () => void;
	status: HookActionStatus;
} & HookShorthandStatus;

/**
 * Type of the return object of the `useOptimisticAction` hook.
 */
export type UseOptimisticActionHookReturn<
	ServerError,
	S extends StandardSchemaV1 | undefined,
	CVE,
	Data,
	State,
> = UseActionHookReturn<ServerError, S, CVE, Data> &
	HookShorthandStatus & {
		optimisticState: State;
	};

/**
 * Type of the return object of the `useAction` hook.
 */
export type InferUseActionHookReturn<T extends Function> =
	T extends CoolActionFn<infer ServerError, infer S extends StandardSchemaV1 | undefined, any, infer CVE, infer Data>
		? UseActionHookReturn<ServerError, S, CVE, Data>
		: never;

/**
 * Type of the return object of the `useOptimisticAction` hook.
 */
export type InferUseOptimisticActionHookReturn<T extends Function, State = any> =
	T extends CoolActionFn<infer ServerError, infer S extends StandardSchemaV1 | undefined, any, infer CVE, infer Data>
		? UseOptimisticActionHookReturn<ServerError, S, CVE, Data, State>
		: never;
