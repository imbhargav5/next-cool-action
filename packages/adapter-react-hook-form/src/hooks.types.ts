import type { StandardSchemaV1 } from "next-cool-action";
import type { HookCallbacks, UseActionHookReturn, UseOptimisticActionHookReturn } from "next-cool-action/hooks";
import type { FieldValues, UseFormProps, UseFormReturn } from "react-hook-form";
import type { ErrorMapperProps } from "./index.types";

/**
 * Optional props for `useHookFormAction` and `useHookFormOptimisticAction`.
 */
export interface HookProps<
	ServerError,
	CVE,
	Data,
	FormValues extends FieldValues = FieldValues,
	FormContext = unknown,
> {
	errorMapProps?: ErrorMapperProps;
	actionProps?: HookCallbacks<ServerError, StandardSchemaV1<FormValues, FormValues>, CVE, Data>;
	formProps?: Omit<UseFormProps<FormValues, FormContext, FormValues>, "resolver">;
}

/**
 * Type of the return object of the `useHookFormAction` hook.
 */
export interface UseHookFormActionHookReturn<
	ServerError,
	CVE,
	Data,
	FormValues extends FieldValues = FieldValues,
	FormContext = unknown,
> {
	action: UseActionHookReturn<ServerError, StandardSchemaV1<FormValues, FormValues>, CVE, Data>;
	form: UseFormReturn<FormValues, FormContext, FormValues>;
	handleSubmitWithAction: (e?: React.BaseSyntheticEvent) => Promise<void>;
	resetFormAndAction: () => void;
}

/**
 * Type of the return object of the `useHookFormOptimisticAction` hook.
 */
export interface UseHookFormOptimisticActionHookReturn<
	ServerError,
	CVE,
	Data,
	State,
	FormValues extends FieldValues = FieldValues,
	FormContext = unknown,
> {
	action: UseOptimisticActionHookReturn<ServerError, StandardSchemaV1<FormValues, FormValues>, CVE, Data, State>;
	form: UseFormReturn<FormValues, FormContext, FormValues>;
	handleSubmitWithAction: (e?: React.BaseSyntheticEvent) => Promise<void>;
	resetFormAndAction: () => void;
}

/**
 * Infer the type of the return object of the `useHookFormAction` hook.
 */
export type InferUseHookFormActionHookReturn<
	FormValues extends FieldValues,
	ServerError = string,
	CVE = unknown,
	Data = unknown,
	FormContext = unknown,
> = UseHookFormActionHookReturn<ServerError, CVE, Data, FormValues, FormContext>;

/**
 * Infer the type of the return object of the `useHookFormOptimisticAction` hook.
 */
export type InferUseHookFormOptimisticActionHookReturn<
	FormValues extends FieldValues,
	State,
	ServerError = string,
	CVE = unknown,
	Data = unknown,
	FormContext = unknown,
> = UseHookFormOptimisticActionHookReturn<ServerError, CVE, Data, State, FormValues, FormContext>;
