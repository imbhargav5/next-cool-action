# Type Inference Fix for next-cool-action

## Issue Summary

When chaining `.inputSchema(schema).action(async ({ parsedInput }) => ...)`, TypeScript infers `parsedInput` as `any` instead of the correct schema type. This causes **73+ type errors** in the playground app.

## Example of the Problem

```typescript
import { z } from "zod";

const schema = z.object({
  username: z.string(),
  password: z.string(),
});

export const loginUser = action
  .metadata({ actionName: "loginUser" })
  .inputSchema(schema)
  .action(async ({ parsedInput }) => {
    // ❌ TypeScript error: parsedInput.username is 'any'
    // Expected: parsedInput.username is 'string'
    console.log(parsedInput.username);
  });
```

---

## Root Cause Analysis

### The Problem: Derived Type Parameter

In `safe-action-client.ts`, the `IS` (input schema) type parameter is **derived** from `ISF` (input schema function):

```typescript
export class SafeActionClient<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  // ⚠️ THIS IS THE PROBLEM - IS is derived from ISF via complex conditional
  IS extends StandardSchemaV1 | undefined = ISF extends Function
    ? Awaited<ReturnType<ISF>>
    : undefined,
  OS extends StandardSchemaV1 | undefined = undefined,
  const BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
>
```

### Why This Breaks Type Inference

1. **Conditional Type Deferral**: TypeScript defers evaluation of `ISF extends Function ? ... : ...` until instantiation, making it hard to track through method chains.

2. **Awaited Complexity**: `Awaited<ReturnType<ISF>>` adds another layer of type extraction that compounds the inference problem.

3. **Method Chain Type Loss**: Each method (`.use()`, `.metadata()`, `.inputSchema()`) returns a new `SafeActionClient` instance. Without explicit type annotations, TypeScript loses track of the generic parameters after 3-4 chained calls.

4. **@ts-expect-error Evidence**: The presence of `@ts-expect-error` comments in the `inputSchema()` method (lines 88, 92, 95) indicates the developers couldn't achieve proper type inference at these critical junctures.

### The Type Flow That Breaks

```
1. User calls: .inputSchema(z.object({ username: z.string() }))

2. inputSchema() wraps it in async function:
   inputSchemaFn = async () => schema  // Runtime: works fine

3. New SafeActionClient created, TypeScript tries to derive:
   ISF = () => Promise<ZodObject<...>>
   IS = Awaited<ReturnType<ISF>> = ZodObject<...>  // ❌ TypeScript gives up here

4. When .action() is called:
   serverCodeFn: ServerCodeFn<MD, Ctx, IS, BAS, Data>
                                    ^^^ IS is 'any' because derivation failed

5. Result: parsedInput has type 'any'
```

---

## The Solution: Decouple `IS` from `ISF`

Make `IS` an **independent** type parameter that's explicitly propagated through method chains, rather than being derived from `ISF`.

### Key Insight

The runtime still needs `ISF` (the async function wrapper) for async schema support, but the **type system** should track `IS` directly.

---

## Implementation Plan

### File 1: `packages/next-cool-action/src/safe-action-client.ts`

#### Change 1.1: Update Class Type Parameters (lines 17-29)

**Before:**
```typescript
export class SafeActionClient<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  IS extends StandardSchemaV1 | undefined = ISF extends Function ? Awaited<ReturnType<ISF>> : undefined,
  OS extends StandardSchemaV1 | undefined = undefined,
  const BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
>
```

**After:**
```typescript
export class SafeActionClient<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  IS extends StandardSchemaV1 | undefined = undefined,  // ✅ Independent, not derived from ISF
  OS extends StandardSchemaV1 | undefined = undefined,
  const BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
>
```

#### Change 1.2: Update `use()` Method with Explicit Return Type (lines 44-50)

**Before:**
```typescript
use<NextCtx extends object>(middlewareFn: MiddlewareFn<ServerError, MD, Ctx, Ctx & NextCtx>) {
  return new SafeActionClient({
    ...this.#args,
    middlewareFns: [...this.#args.middlewareFns, middlewareFn],
    ctxType: {} as Ctx & NextCtx,
  });
}
```

**After:**
```typescript
use<NextCtx extends object>(
  middlewareFn: MiddlewareFn<ServerError, MD, Ctx, Ctx & NextCtx>
): SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx & NextCtx, ISF, IS, OS, BAS, CVE> {
  return new SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx & NextCtx, ISF, IS, OS, BAS, CVE>({
    ...this.#args,
    middlewareFns: [...this.#args.middlewareFns, middlewareFn],
    ctxType: {} as Ctx & NextCtx,
  });
}
```

#### Change 1.3: Update `metadata()` Method with Explicit Return Type (lines 58-64)

**Before:**
```typescript
metadata(data: MD) {
  return new SafeActionClient({
    ...this.#args,
    metadata: data,
    metadataProvided: true,
  });
}
```

**After:**
```typescript
metadata(data: MD): SafeActionClient<ServerError, ODVES, MetadataSchema, MD, true, Ctx, ISF, IS, OS, BAS, CVE> {
  return new SafeActionClient<ServerError, ODVES, MetadataSchema, MD, true, Ctx, ISF, IS, OS, BAS, CVE>({
    ...this.#args,
    metadata: data,
    metadataProvided: true,
  });
}
```

#### Change 1.4: Update `inputSchema()` Method - The Critical Fix (lines 73-99)

**Before:**
```typescript
inputSchema<
  OIS extends StandardSchemaV1 | ((prevSchema: IS) => Promise<StandardSchemaV1>),
  AIS extends StandardSchemaV1 = OIS extends (prevSchema: IS) => Promise<StandardSchemaV1>
    ? Awaited<ReturnType<OIS>>
    : OIS,
  OCVE = ODVES extends "flattened" ? FlattenedValidationErrors<ValidationErrors<AIS>> : ValidationErrors<AIS>,
>(
  inputSchema: OIS,
  utils?: {
    handleValidationErrorsShape?: HandleValidationErrorsShapeFn<AIS, BAS, MD, Ctx, OCVE>;
  }
) {
  return new SafeActionClient({
    ...this.#args,
    // @ts-expect-error
    inputSchemaFn: (inputSchema[Symbol.toStringTag] === "AsyncFunction"
      ? async () => {
          const prevSchema = await this.#args.inputSchemaFn?.();
          // @ts-expect-error
          return inputSchema(prevSchema as IS) as AIS;
        }
      : async () => inputSchema) as ISF,
    handleValidationErrorsShape: (utils?.handleValidationErrorsShape ??
      this.#args.handleValidationErrorsShape) as HandleValidationErrorsShapeFn<AIS, BAS, MD, Ctx, OCVE>,
  });
}
```

**After:**
```typescript
inputSchema<
  OIS extends StandardSchemaV1 | ((prevSchema: IS) => Promise<StandardSchemaV1>),
  AIS extends StandardSchemaV1 = OIS extends (prevSchema: IS) => Promise<StandardSchemaV1>
    ? Awaited<ReturnType<OIS>>
    : OIS extends StandardSchemaV1
      ? OIS
      : never,
  OCVE = ODVES extends "flattened" ? FlattenedValidationErrors<ValidationErrors<AIS>> : ValidationErrors<AIS>,
>(
  inputSchema: OIS,
  utils?: {
    handleValidationErrorsShape?: HandleValidationErrorsShapeFn<AIS, BAS, MD, Ctx, OCVE>;
  }
): SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, () => Promise<AIS>, AIS, OS, BAS, OCVE> {
  // ✅ Explicit return type: IS is set to AIS (the resolved schema type)

  const newInputSchemaFn = (inputSchema[Symbol.toStringTag] === "AsyncFunction"
    ? async () => {
        const prevSchema = await this.#args.inputSchemaFn?.();
        return (inputSchema as (prevSchema: IS) => Promise<StandardSchemaV1>)(prevSchema as IS);
      }
    : async () => inputSchema) as () => Promise<AIS>;

  return new SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, () => Promise<AIS>, AIS, OS, BAS, OCVE>({
    ...this.#args,
    inputSchemaFn: newInputSchemaFn,
    handleValidationErrorsShape: (utils?.handleValidationErrorsShape ??
      this.#args.handleValidationErrorsShape) as HandleValidationErrorsShapeFn<AIS, BAS, MD, Ctx, OCVE>,
  });
}
```

#### Change 1.5: Update `bindArgsSchemas()` Method (lines 112-124)

**Before:**
```typescript
bindArgsSchemas<const OBAS extends readonly StandardSchemaV1[]>(bindArgsSchemas: OBAS) {
  return new SafeActionClient({
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
```

**After:**
```typescript
bindArgsSchemas<const OBAS extends readonly StandardSchemaV1[]>(
  bindArgsSchemas: OBAS
): SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, OBAS, CVE> {
  return new SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OS, OBAS, CVE>({
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
```

#### Change 1.6: Update `outputSchema()` Method (lines 132-137)

**Before:**
```typescript
outputSchema<OOS extends StandardSchemaV1>(dataSchema: OOS) {
  return new SafeActionClient({
    ...this.#args,
    outputSchema: dataSchema,
  });
}
```

**After:**
```typescript
outputSchema<OOS extends StandardSchemaV1>(
  dataSchema: OOS
): SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OOS, BAS, CVE> {
  return new SafeActionClient<ServerError, ODVES, MetadataSchema, MD, MDProvided, Ctx, ISF, IS, OOS, BAS, CVE>({
    ...this.#args,
    outputSchema: dataSchema,
  });
}
```

---

### File 2: `packages/next-cool-action/src/index.types.ts`

#### Change 2.1: Update `SafeActionClientArgs` Type (lines 36-61)

**Before:**
```typescript
export type SafeActionClientArgs<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  IS extends StandardSchemaV1 | undefined = ISF extends Function ? Awaited<ReturnType<ISF>> : undefined,
  OS extends StandardSchemaV1 | undefined = undefined,
  BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
> = {
  // ... fields
};
```

**After:**
```typescript
export type SafeActionClientArgs<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  MDProvided extends boolean = MetadataSchema extends undefined ? true : false,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  IS extends StandardSchemaV1 | undefined = undefined,  // ✅ Independent
  OS extends StandardSchemaV1 | undefined = undefined,
  BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
> = {
  // ... fields remain the same
};
```

---

### File 3: `packages/next-cool-action/src/action-builder.ts`

#### Change 3.1: Update Function Type Parameters (lines 34-45)

**Before:**
```typescript
export function actionBuilder<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  IS extends StandardSchemaV1 | undefined = ISF extends Function ? Awaited<ReturnType<ISF>> : undefined,
  OS extends StandardSchemaV1 | undefined = undefined,
  const BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
>(args: SafeActionClientArgs<ServerError, ODVES, MetadataSchema, MD, true, Ctx, ISF, IS, OS, BAS, CVE>) {
```

**After:**
```typescript
export function actionBuilder<
  ServerError,
  ODVES extends DVES | undefined,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
  MD = InferOutputOrDefault<MetadataSchema, undefined>,
  Ctx extends object = {},
  ISF extends (() => Promise<StandardSchemaV1>) | undefined = undefined,
  IS extends StandardSchemaV1 | undefined = undefined,  // ✅ Independent
  OS extends StandardSchemaV1 | undefined = undefined,
  const BAS extends readonly StandardSchemaV1[] = [],
  CVE = undefined,
>(args: SafeActionClientArgs<ServerError, ODVES, MetadataSchema, MD, true, Ctx, ISF, IS, OS, BAS, CVE>) {
```

---

### File 4: `packages/next-cool-action/src/index.ts`

#### Change 4.1: Add Explicit Type Parameters to Constructor (lines 44-59)

**Before:**
```typescript
return new SafeActionClient({
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
  handleValidationErrorsShape: async (ve) =>
    createOpts?.defaultValidationErrorsShape === "flattened"
      ? flattenValidationErrors(ve)
      : formatValidationErrors(ve),
});
```

**After:**
```typescript
return new SafeActionClient<
  ServerError,
  ODVES,
  MetadataSchema,
  InferOutputOrDefault<MetadataSchema, undefined>,
  MetadataSchema extends undefined ? true : false,
  {},        // Ctx
  undefined, // ISF
  undefined, // IS - explicitly undefined at initialization
  undefined, // OS
  [],        // BAS
  undefined  // CVE
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
  handleValidationErrorsShape: async (ve) =>
    createOpts?.defaultValidationErrorsShape === "flattened"
      ? flattenValidationErrors(ve)
      : formatValidationErrors(ve),
});
```

---

## Summary of Changes

| File | Location | Change Description |
|------|----------|-------------------|
| `safe-action-client.ts` | Line 25 | Remove `IS` derivation from `ISF`, make it independent with `= undefined` |
| `safe-action-client.ts` | Lines 44-50 | Add explicit return type to `use()` method |
| `safe-action-client.ts` | Lines 58-64 | Add explicit return type to `metadata()` method |
| `safe-action-client.ts` | Lines 73-99 | Add explicit return type to `inputSchema()`, set `IS = AIS` |
| `safe-action-client.ts` | Lines 112-124 | Add explicit return type to `bindArgsSchemas()` method |
| `safe-action-client.ts` | Lines 132-137 | Add explicit return type to `outputSchema()` method |
| `index.types.ts` | Line 44 | Remove `IS` derivation from `ISF` |
| `action-builder.ts` | Line 41 | Remove `IS` derivation from `ISF` |
| `index.ts` | Lines 44-59 | Add explicit type parameters to `SafeActionClient` constructor |

---

## Expected Results After Fix

### 1. Sync Schema Inference Works

```typescript
ac.inputSchema(z.object({ name: z.string() }))
  .action(async ({ parsedInput }) => {
    parsedInput.name  // ✅ TypeScript knows this is 'string'
  });
```

### 2. Async Schema Inference Works

```typescript
ac.inputSchema(async () => z.object({ name: z.string() }))
  .action(async ({ parsedInput }) => {
    parsedInput.name  // ✅ TypeScript knows this is 'string'
  });
```

### 3. Chained Schema Extension Works

```typescript
ac.inputSchema(z.object({ a: z.string() }))
  .inputSchema(async (prev) => prev.extend({ b: z.number() }))
  .action(async ({ parsedInput }) => {
    parsedInput.a  // ✅ string
    parsedInput.b  // ✅ number
  });
```

### 4. Playground Type Errors Reduced

- **Before**: 73+ type errors
- **After**: ~10-15 remaining errors (unrelated to schema inference)

---

## Remaining Playground Fixes After Library Update

After applying the library fix, these playground-specific issues may still need manual fixes:

1. **`HookActionStatus` export** (`result-box.tsx:1`)
   - Verify the build output includes this type export
   - The library already has `export type * from "./hooks.types"` which should work

2. **`handleServerError` parameter type** (`safe-action.ts:9`)
   ```typescript
   // Add explicit type annotation
   handleServerError: (e: Error) => { ... }
   ```

3. **Middleware `.use()` callbacks** (`safe-action.ts:26, 57, 69`)
   - These should auto-fix once library types are correct
   - If not, add explicit parameter types

4. **`stateAction` type parameter** (`stateful-form-action.ts:18`)
   ```typescript
   // Remove the type argument - it's inferred from return type
   .stateAction(async ({ parsedInput }, { prevResult }) => { ... })
   ```

5. **`useActionState` initial state** (`stateful-form/page.tsx:11`)
   ```typescript
   // Add missing properties
   const [state, formAction, isPending] = useActionState(statefulFormAction, {
     data: { newName: "foo" },
     validationErrors: undefined,
     serverError: undefined,
   });
   ```

---

## Testing the Fix

### Step 1: Apply Library Changes
```bash
# Edit the 4 files as described above
```

### Step 2: Rebuild the Library
```bash
pnpm build:lib
```

### Step 3: Run Library Tests
```bash
pnpm test:lib
# All 60 tests should pass
```

### Step 4: Run Type Check
```bash
pnpm typecheck
# Should show significant reduction in errors
```

### Step 5: Fix Remaining Playground Errors
Apply the manual fixes listed in "Remaining Playground Fixes" section.

---

## Why This Works

The fix works because:

1. **Direct Type Propagation**: Instead of TypeScript trying to derive `IS` from `ISF` through complex conditionals, we explicitly set `IS` in each method's return type.

2. **Explicit Return Types**: Every method that returns a new `SafeActionClient` now has an explicit return type that includes all generic parameters, ensuring no type information is lost.

3. **The Key Change in `inputSchema()`**: The return type explicitly sets `IS = AIS`, where `AIS` is the actual resolved schema type. This directly tells TypeScript what the schema type is, rather than asking it to derive it.

4. **Runtime Unchanged**: All runtime behavior remains identical. The `inputSchemaFn` async wrapper still works the same way - we're only fixing the type system's understanding of the code.

---

## Backward Compatibility

This change is **fully backward compatible**:

- No API changes for consumers
- No runtime behavior changes
- Existing code continues to work
- Type inference improves automatically
