import * as React from "react";
import type { HookActionStatus, HookCallbacks, HookSafeActionFn, HookShorthandStatus } from "./hooks.types";
import type { SafeActionResult } from "./index.types";
import { FrameworkErrorHandler } from "./next/errors";
import type { InferInputOrDefault, StandardSchemaV1 } from "./standard-schema";

export const getActionStatus = <ServerError, S extends StandardSchemaV1 | undefined, CVE, Data>({
	isIdle,
	isExecuting,
	isTransitioning,
	result,
	hasNavigated,
	hasThrownError,
}: {
	isIdle: boolean;
	isExecuting: boolean;
	isTransitioning: boolean;
	hasNavigated: boolean;
	hasThrownError: boolean;
	result: SafeActionResult<ServerError, S, CVE, Data>;
}): HookActionStatus => {
	if (isIdle) {
		return "idle";
	} else if (isExecuting) {
		return "executing";
	} else if (isTransitioning) {
		return "transitioning";
	} else if (
		hasThrownError ||
		typeof result.validationErrors !== "undefined" ||
		typeof result.serverError !== "undefined"
	) {
		return "hasErrored";
	} else if (hasNavigated) {
		return "hasNavigated";
	} else {
		return "hasSucceeded";
	}
};

export const getActionShorthandStatusObject = (status: HookActionStatus): HookShorthandStatus => {
	return {
		isIdle: status === "idle",
		isExecuting: status === "executing",
		isTransitioning: status === "transitioning",
		isPending: status === "executing" || status === "transitioning",
		hasSucceeded: status === "hasSucceeded",
		hasErrored: status === "hasErrored",
		hasNavigated: status === "hasNavigated",
	};
};

/**
 * Check if the result has errors (validation errors, server errors, or thrown errors)
 */
const hasResultErrors = <ServerError, S extends StandardSchemaV1 | undefined, CVE, Data>(
	result: SafeActionResult<ServerError, S, CVE, Data>,
	thrownError: Error | null
): boolean => {
	return (
		thrownError !== null ||
		typeof result.validationErrors !== "undefined" ||
		typeof result.serverError !== "undefined"
	);
};

/**
 * Internal base hook that handles the core action execution logic.
 * Used by both useAction and useOptimisticAction.
 */
export function useInternalAction<ServerError, S extends StandardSchemaV1 | undefined, CVE, Data>(
	safeActionFn: HookSafeActionFn<ServerError, S, CVE, Data>,
	cb?: HookCallbacks<ServerError, S, CVE, Data>,
	options?: {
		onBeforeExecute?: (input: InferInputOrDefault<S, undefined>) => void;
	}
) {
	const [isTransitioning, startTransition] = React.useTransition();
	const [result, setResult] = React.useState<SafeActionResult<ServerError, S, CVE, Data>>({});
	const [clientInput, setClientInput] = React.useState<InferInputOrDefault<S, void>>();
	const [isExecuting, setIsExecuting] = React.useState(false);
	const [navigationError, setNavigationError] = React.useState<Error | null>(null);
	const [thrownError, setThrownError] = React.useState<Error | null>(null);
	const [isIdle, setIsIdle] = React.useState(true);

	// Store callbacks in ref for stability (avoid recreating execute when callbacks change)
	const cbRef = React.useRef(cb);
	cbRef.current = cb;

	// Store options in ref for stability
	const optionsRef = React.useRef(options);
	optionsRef.current = options;

	const status = getActionStatus<ServerError, S, CVE, Data>({
		isExecuting,
		isTransitioning,
		result,
		isIdle,
		hasNavigated: navigationError !== null,
		hasThrownError: thrownError !== null,
	});

	const execute = React.useCallback(
		(input: InferInputOrDefault<S, void>) => {
			// Call onExecute callback immediately
			cbRef.current?.onExecute?.({ input: input as InferInputOrDefault<S, undefined> });

			setTimeout(() => {
				setIsIdle(false);
				setNavigationError(null);
				setThrownError(null);
				setClientInput(input);
				setIsExecuting(true);
			}, 0);

			startTransition(() => {
				// Call onBeforeExecute (used for optimistic updates)
				optionsRef.current?.onBeforeExecute?.(input as InferInputOrDefault<S, undefined>);

				safeActionFn(input as InferInputOrDefault<S, undefined>)
					.then((res) => {
						const safeRes = res ?? {};
						setResult(safeRes);

						// Call success/error callbacks directly
						if (!hasResultErrors(safeRes, null)) {
							cbRef.current?.onSuccess?.({ data: safeRes.data!, input: input as InferInputOrDefault<S, undefined> });
							cbRef.current?.onSettled?.({ result: safeRes, input: input as InferInputOrDefault<S, undefined> });
						} else {
							cbRef.current?.onError?.({
								error: safeRes,
								input: input as InferInputOrDefault<S, undefined>,
							});
							cbRef.current?.onSettled?.({ result: safeRes, input: input as InferInputOrDefault<S, undefined> });
						}
					})
					.catch((e) => {
						setResult({});

						if (FrameworkErrorHandler.isNavigationError(e)) {
							setNavigationError(e);
							const navigationKind = FrameworkErrorHandler.getNavigationKind(e);
							cbRef.current?.onNavigation?.({
								input: input as InferInputOrDefault<S, undefined>,
								navigationKind,
							});
							cbRef.current?.onSettled?.({
								result: {},
								input: input as InferInputOrDefault<S, undefined>,
								navigationKind,
							});
							return;
						}

						setThrownError(e as Error);
						cbRef.current?.onError?.({
							error: { thrownError: e as Error },
							input: input as InferInputOrDefault<S, undefined>,
						});
						cbRef.current?.onSettled?.({ result: {}, input: input as InferInputOrDefault<S, undefined> });
						throw e;
					})
					.finally(() => {
						setIsExecuting(false);
					});
			});
		},
		[safeActionFn]
	);

	const executeAsync = React.useCallback(
		(input: InferInputOrDefault<S, void>) => {
			const fn = new Promise<Awaited<ReturnType<typeof safeActionFn>>>((resolve, reject) => {
				// Call onExecute callback immediately
				cbRef.current?.onExecute?.({ input: input as InferInputOrDefault<S, undefined> });

				setTimeout(() => {
					setIsIdle(false);
					setNavigationError(null);
					setThrownError(null);
					setClientInput(input);
					setIsExecuting(true);
				}, 0);

				startTransition(() => {
					// Call onBeforeExecute (used for optimistic updates)
					optionsRef.current?.onBeforeExecute?.(input as InferInputOrDefault<S, undefined>);

					safeActionFn(input as InferInputOrDefault<S, undefined>)
						.then((res) => {
							const safeRes = res ?? {};
							setResult(safeRes);

							// Call success/error callbacks directly
							if (!hasResultErrors(safeRes, null)) {
								cbRef.current?.onSuccess?.({ data: safeRes.data!, input: input as InferInputOrDefault<S, undefined> });
								cbRef.current?.onSettled?.({ result: safeRes, input: input as InferInputOrDefault<S, undefined> });
							} else {
								cbRef.current?.onError?.({
									error: safeRes,
									input: input as InferInputOrDefault<S, undefined>,
								});
								cbRef.current?.onSettled?.({ result: safeRes, input: input as InferInputOrDefault<S, undefined> });
							}

							resolve(res);
						})
						.catch((e) => {
							setResult({});

							if (FrameworkErrorHandler.isNavigationError(e)) {
								setNavigationError(e);
								const navigationKind = FrameworkErrorHandler.getNavigationKind(e);
								cbRef.current?.onNavigation?.({
									input: input as InferInputOrDefault<S, undefined>,
									navigationKind,
								});
								cbRef.current?.onSettled?.({
									result: {},
									input: input as InferInputOrDefault<S, undefined>,
									navigationKind,
								});
								return;
							}

							setThrownError(e as Error);
							cbRef.current?.onError?.({
								error: { thrownError: e as Error },
								input: input as InferInputOrDefault<S, undefined>,
							});
							cbRef.current?.onSettled?.({ result: {}, input: input as InferInputOrDefault<S, undefined> });
							reject(e);
						})
						.finally(() => {
							setIsExecuting(false);
						});
				});
			});

			return fn;
		},
		[safeActionFn]
	);

	const reset = React.useCallback(() => {
		setIsIdle(true);
		setNavigationError(null);
		setThrownError(null);
		setClientInput(undefined);
		setResult({});
	}, []);

	return {
		execute,
		executeAsync,
		input: clientInput as InferInputOrDefault<S, undefined>,
		result,
		reset,
		status,
		...getActionShorthandStatusObject(status),
	};
}
