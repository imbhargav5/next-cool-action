"use client";

import * as React from "react";
import { useInternalAction } from "./hooks-utils";
import type {
	HookCallbacks,
	HookCoolActionFn,
	UseActionHookReturn,
	UseOptimisticActionHookReturn,
} from "./hooks.types";
import type { InferInputOrDefault, StandardSchemaV1 } from "./standard-schema";

// HOOKS

/**
 * Use the action from a Client Component via hook.
 * @param coolActionFn The action function
 * @param cb Optional base utils and callbacks
 *
 * {@link https://next-cool-action.dev/docs/execute-actions/hooks/useaction See docs for more information}
 */
export const useAction = <ServerError, S extends StandardSchemaV1 | undefined, CVE, Data>(
	coolActionFn: HookCoolActionFn<ServerError, S, CVE, Data>,
	cb?: HookCallbacks<ServerError, S, CVE, Data>
): UseActionHookReturn<ServerError, S, CVE, Data> => {
	return useInternalAction(coolActionFn, cb);
};

/**
 * Use the action from a Client Component via hook, with optimistic data update.
 * @param coolActionFn The action function
 * @param utils Required `currentData` and `updateFn` and optional callbacks
 *
 * {@link https://next-cool-action.dev/docs/execute-actions/hooks/useoptimisticaction See docs for more information}
 */
export const useOptimisticAction = <ServerError, S extends StandardSchemaV1 | undefined, CVE, Data, State>(
	coolActionFn: HookCoolActionFn<ServerError, S, CVE, Data>,
	utils: {
		currentState: State;
		updateFn: (state: State, input: InferInputOrDefault<S, void>) => State;
	} & HookCallbacks<ServerError, S, CVE, Data>
): UseOptimisticActionHookReturn<ServerError, S, CVE, Data, State> => {
	const [optimisticState, setOptimisticValue] = React.useOptimistic<State, InferInputOrDefault<S, undefined>>(
		utils.currentState,
		utils.updateFn
	);

	const baseHook = useInternalAction(
		coolActionFn,
		{
			onExecute: utils.onExecute,
			onSuccess: utils.onSuccess,
			onError: utils.onError,
			onSettled: utils.onSettled,
			onNavigation: utils.onNavigation,
		},
		{
			onBeforeExecute: setOptimisticValue,
		}
	);

	return {
		...baseHook,
		optimisticState,
	};
};

export type * from "./hooks.types";
