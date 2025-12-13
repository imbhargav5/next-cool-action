/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import type { CoolActionFn } from "next-cool-action";
import type { HookCallbacks, UseActionHookReturn, UseOptimisticActionHookReturn } from "next-cool-action/hooks";
import type { UseFormProps, UseFormReturn } from "react-hook-form";
import type { ErrorMapperProps } from "./index.types";
import type { InferInputOrDefault, InferOutputOrDefault, StandardSchemaV1 } from "./standard-schema";

/**
 * Optional props for `useHookFormAction` and `useHookFormOptimisticAction`.
 */
export interface HookProps<ServerError, S extends StandardSchemaV1 | undefined, CVE, Data, FormContext = any> {
	errorMapProps?: ErrorMapperProps;
	actionProps?: HookCallbacks<ServerError, S, CVE, Data>;
	formProps?: Omit<UseFormProps<InferInputOrDefault<S, any>, FormContext, InferOutputOrDefault<S, any>>, "resolver">;
}

/**
 * Type of the return object of the `useHookFormAction` hook.
 */
export interface UseHookFormActionHookReturn<
	ServerError,
	S extends StandardSchemaV1 | undefined,
	CVE,
	Data,
	FormContext = any,
> {
	action: UseActionHookReturn<ServerError, S, CVE, Data>;
	form: UseFormReturn<InferInputOrDefault<S, any>, FormContext, InferOutputOrDefault<S, any>>;
	handleSubmitWithAction: (e?: React.BaseSyntheticEvent) => Promise<void>;
	resetFormAndAction: () => void;
}

/**
 * Type of the return object of the `useHookFormOptimisticAction` hook.
 */
export type UseHookFormOptimisticActionHookReturn<
	ServerError,
	S extends StandardSchemaV1 | undefined,
	CVE,
	Data,
	State,
	FormContext = any,
> = Omit<UseHookFormActionHookReturn<ServerError, S, CVE, Data, FormContext>, "action"> & {
	action: UseOptimisticActionHookReturn<ServerError, S, CVE, Data, State>;
};

/**
 * Infer the type of the return object of the `useHookFormAction` hook.
 */
export type InferUseHookFormActionHookReturn<T extends Function, FormContext = any> =
	T extends CoolActionFn<infer ServerError, infer S extends StandardSchemaV1 | undefined, any, infer CVE, infer Data>
		? UseHookFormActionHookReturn<ServerError, S, CVE, Data, FormContext>
		: never;

/**
 * Infer the type of the return object of the `useHookFormOptimisticAction` hook.
 */
export type InferUseHookFormOptimisticActionHookReturn<T extends Function, State, FormContext = any> =
	T extends CoolActionFn<infer ServerError, infer S extends StandardSchemaV1 | undefined, any, infer CVE, infer Data>
		? UseHookFormOptimisticActionHookReturn<ServerError, S, CVE, Data, State, FormContext>
		: never;

