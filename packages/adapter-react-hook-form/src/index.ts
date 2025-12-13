import type { StandardSchemaV1, ValidationErrors } from "next-cool-action";
import type { FieldError, FieldErrors, FieldValues } from "react-hook-form";
import type { ErrorMapperProps } from "./index.types";

/**
 * Maps a validation errors object to an object of `FieldErrors` compatible with react-hook-form.
 * You should only call this function directly for advanced use cases, and prefer exported hooks.
 */
export function mapToHookFormErrors<
	S extends StandardSchemaV1 | undefined,
	TFieldValues extends FieldValues = FieldValues,
>(validationErrors: ValidationErrors<S> | undefined, props?: ErrorMapperProps): FieldErrors<TFieldValues> | undefined {
	if (!validationErrors || Object.keys(validationErrors).length === 0) {
		return undefined;
	}

	const fieldErrors: Record<string, unknown> = {};

	function mapper(ve: Record<string, unknown>, paths: string[] = []) {
		// Map through validation errors.
		for (const key of Object.keys(ve)) {
			const value = ve[key];
			// If validation error is an object, recursively call mapper so we go one level deeper
			// at a time. Pass the current paths to the mapper as well.
			if (typeof value === "object" && value && !Array.isArray(value)) {
				mapper(value as Record<string, unknown>, [...paths, key]);
			}

			// We're just interested in the `_errors` field, which must be an array.
			if (key === "_errors" && Array.isArray(value)) {
				// Initially set moving reference to root `fieldErrors` object.
				let ref: Record<string, unknown> = fieldErrors;

				// Iterate through the paths, create nested objects if needed and move the reference.
				for (let i = 0; i < paths.length - 1; i++) {
					const p = paths[i]!;
					ref[p] ??= {};
					ref = ref[p] as Record<string, unknown>;
				}

				// The actual path is the last one. If it's undefined, it means that we're at the root level.
				const path = paths.at(-1) ?? "root";

				// Set the error for the current path.
				ref[path] = {
					type: "validate",
					message: (value as string[]).join(props?.joinBy ?? " "),
				} as FieldError;
			}
		}
	}

	mapper(validationErrors as Record<string, unknown>);

	return fieldErrors as FieldErrors<TFieldValues>;
}

export type * from "./index.types";
