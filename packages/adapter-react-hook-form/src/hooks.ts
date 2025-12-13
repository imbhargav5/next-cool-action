"use client";

import type { CoolActionResult, StandardSchemaV1, ValidationErrors } from "next-cool-action";
import { useAction, useOptimisticAction } from "next-cool-action/hooks";
import * as React from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import type {
	HookProps,
	UseHookFormActionHookReturn,
	UseHookFormOptimisticActionHookReturn,
} from "./hooks.types";
import type { ErrorMapperProps } from "./index";
import { mapToHookFormErrors } from "./index";

/**
 * For more advanced use cases where you want full customization of the hooks used, you can
 * use this hook to map a validation errors object to a `FieldErrors` compatible with react-hook-form.
 * You can then pass the returned `hookFormValidationErrors` property to `useForm`'s `errors` prop.
 *
 * @param validationErrors Validation errors object from `next-cool-action`
 * @returns Object of `FieldErrors` compatible with react-hook-form
 */
export function useHookFormActionErrorMapper<S extends StandardSchemaV1 | undefined>(
	validationErrors: ValidationErrors<S> | undefined,
	props?: ErrorMapperProps
) {
	const propsRef = React.useRef(props);

	const hookFormValidationErrors = React.useMemo(
		() => mapToHookFormErrors<S>(validationErrors, propsRef.current),
		[validationErrors]
	);

	return {
		hookFormValidationErrors,
	};
}

/**
 * Type for the cool action function that can be passed to the hooks.
 * This accepts both CoolActionFn (with no bind args) and HookCoolActionFn.
 */
type CoolActionFnInput<FormValues extends FieldValues, ServerError, CVE, Data> = (
	input: FormValues
) => Promise<CoolActionResult<ServerError, StandardSchemaV1<FormValues, FormValues> | undefined, CVE, Data>>;

/**
 * This hook is a wrapper around `useAction` and `useForm` that makes it easier to use cool actions
 * with react-hook-form. It also maps validation errors to `FieldErrors` compatible with react-hook-form.
 *
 * @param coolAction The cool action
 * @param hookFormResolver A react-hook-form validation resolver
 * @param props Optional props for both `useAction`, `useForm` hooks and error mapper
 * @returns An object containing `action` and `form` controllers, `handleSubmitWithAction`, and `resetFormAndAction`
 */
export function useHookFormAction<
	FormValues extends FieldValues,
	ServerError = string,
	CVE = ValidationErrors<StandardSchemaV1<FormValues, FormValues>>,
	Data = unknown,
	FormContext = unknown,
>(
	coolAction: CoolActionFnInput<FormValues, ServerError, CVE, Data>,
	hookFormResolver: Resolver<FormValues, FormContext, FormValues>,
	props?: HookProps<ServerError, CVE, Data, FormValues, FormContext>
): UseHookFormActionHookReturn<ServerError, CVE, Data, FormValues, FormContext> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const action = useAction(coolAction as any, props?.actionProps as any);

	const { hookFormValidationErrors } = useHookFormActionErrorMapper<StandardSchemaV1<FormValues, FormValues>>(
		action.result.validationErrors as ValidationErrors<StandardSchemaV1<FormValues, FormValues>> | undefined,
		props?.errorMapProps
	);

	const form = useForm<FormValues, FormContext, FormValues>({
		...props?.formProps,
		resolver: hookFormResolver,
		errors: hookFormValidationErrors,
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleSubmitWithAction = form.handleSubmit(action.executeAsync as any);

	const resetFormAndAction = () => {
		form.reset();
		action.reset();
	};

	return {
		action: action as UseHookFormActionHookReturn<ServerError, CVE, Data, FormValues, FormContext>["action"],
		form,
		handleSubmitWithAction,
		resetFormAndAction,
	};
}

/**
 * This hook is a wrapper around `useOptimisticAction` and `useForm` that makes it easier to use cool actions
 * with react-hook-form. It also maps validation errors to `FieldErrors` compatible with react-hook-form.
 *
 * @param coolAction The cool action
 * @param hookFormResolver A react-hook-form validation resolver
 * @param props Required `currentState` and `updateFn` props for the action, and additional optional
 * props for both `useAction`, `useForm` hooks and error mapper
 * @returns An object containing `action` and `form` controllers, `handleSubmitWithAction`, and `resetFormAndAction`
 */
export function useHookFormOptimisticAction<
	FormValues extends FieldValues,
	State,
	ServerError = string,
	CVE = ValidationErrors<StandardSchemaV1<FormValues, FormValues>>,
	Data = unknown,
	FormContext = unknown,
>(
	coolAction: CoolActionFnInput<FormValues, ServerError, CVE, Data>,
	hookFormResolver: Resolver<FormValues, FormContext, FormValues>,
	props: HookProps<ServerError, CVE, Data, FormValues, FormContext> & {
		actionProps: {
			currentState: State;
			updateFn: (state: State, input: FormValues) => State;
		};
	}
): UseHookFormOptimisticActionHookReturn<ServerError, CVE, Data, State, FormValues, FormContext> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const action = useOptimisticAction(coolAction as any, props.actionProps as any);

	const { hookFormValidationErrors } = useHookFormActionErrorMapper<StandardSchemaV1<FormValues, FormValues>>(
		action.result.validationErrors as ValidationErrors<StandardSchemaV1<FormValues, FormValues>> | undefined,
		props.errorMapProps
	);

	const form = useForm<FormValues, FormContext, FormValues>({
		...props?.formProps,
		resolver: hookFormResolver,
		errors: hookFormValidationErrors,
	});

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handleSubmitWithAction = form.handleSubmit(action.executeAsync as any);

	const resetFormAndAction = () => {
		form.reset();
		action.reset();
	};

	return {
		action: action as UseHookFormOptimisticActionHookReturn<ServerError, CVE, Data, State, FormValues, FormContext>["action"],
		form,
		handleSubmitWithAction,
		resetFormAndAction,
	};
}

export type * from "./hooks.types";
