# Validation and Error Handling

This document covers the validation system in `next-cool-action`, including the Standard Schema interface, validation error types, error shaping utilities, and server error handling.

---

## Diagram 1: Standard Schema Validation Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Standard Schema Validation Flow                             │
│                                                                                  │
│   The library uses Standard Schema interface for validation library agnosticism  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         Client Input (unknown)
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │         standardParse(schema, input) │
              │                                      │
              │   Calls schema["~standard"].validate │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │     Any Standard Schema Library      │
              │                                      │
              │  ┌─────────┐  ┌─────────┐  ┌──────┐ │
              │  │   Zod   │  │ Valibot │  │ArkType│ │
              │  └─────────┘  └─────────┘  └──────┘ │
              │                                      │
              │  All implement StandardSchemaV1:     │
              │  {                                   │
              │    "~standard": {                    │
              │      version: 1,                     │
              │      vendor: "zod" | "valibot" | ... │
              │      validate: (value) => Result     │
              │    }                                 │
              │  }                                   │
              └─────────────────┬───────────────────┘
                                │
           ┌────────────────────┴────────────────────┐
           │                                         │
           ▼                                         ▼
    ┌─────────────────────┐               ┌─────────────────────┐
    │   SuccessResult     │               │   FailureResult     │
    │                     │               │                     │
    │   {                 │               │   {                 │
    │     value: Output   │               │     issues: [       │
    │     issues: undefined│              │       { message,    │
    │   }                 │               │         path }      │
    │                     │               │     ]               │
    └──────────┬──────────┘               │   }                 │
               │                          └──────────┬──────────┘
               │                                     │
               ▼                                     ▼
    ┌─────────────────────┐               ┌─────────────────────┐
    │  Continue with      │               │  Build validation   │
    │  parsedInput        │               │  errors             │
    │                     │               │                     │
    │  Pass to server     │               │  buildValidationErrors│
    │  code function      │               │  (issues)           │
    └─────────────────────┘               └─────────────────────┘
```

### standardParse() Function

```typescript
// standard-schema.ts
export async function standardParse<Output>(
  schema: StandardSchemaV1<unknown, Output>, 
  value: unknown
) {
  return schema["~standard"].validate(value);
}
```

The function is intentionally simple - it just delegates to the schema's validate method. This allows any Standard Schema-compliant library to work seamlessly.

---

## Diagram 2: Input Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Input Validation Pipeline                                │
│                                                                                  │
│   Shows how clientInputs are processed through the validation system            │
└─────────────────────────────────────────────────────────────────────────────────┘

    Action Called: action(bindArg1, bindArg2, mainInput)
                           │
                           ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │   clientInputs Array                                                       │
    │                                                                            │
    │   [ bindArg1, bindArg2, mainInput ]                                        │
    │       ↓          ↓          ↓                                              │
    │     idx 0      idx 1      idx 2 (last = main input)                        │
    └───────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │   Parallel Validation (Promise.all)                                        │
    │                                                                            │
    │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
    │   │ bindArgsSchemas │  │ bindArgsSchemas │  │  inputSchemaFn  │           │
    │   │      [0]        │  │      [1]        │  │    (if exists)  │           │
    │   │                 │  │                 │  │                 │           │
    │   │ standardParse   │  │ standardParse   │  │ standardParse   │           │
    │   │ (schema, arg1)  │  │ (schema, arg2)  │  │ (schema, main)  │           │
    │   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
    │            │                    │                    │                     │
    │            ▼                    ▼                    ▼                     │
    │       Result[0]            Result[1]            Result[2]                  │
    └───────────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
    ┌───────────────────────────────────────────────────────────────────────────┐
    │   Process Results                                                          │
    │                                                                            │
    │   for each result:                                                         │
    │                                                                            │
    │   ┌─────────────────────────────────────────────────────────────────────┐ │
    │   │  if (!result.issues)                                                 │ │
    │   │    parsedInputDatas.push(result.value)                               │ │
    │   │                                                                      │ │
    │   │  else if (isBindArg)        // idx < results.length - 1             │ │
    │   │    bindArgsValidationErrors[idx] = buildValidationErrors(issues)     │ │
    │   │    hasBindValidationErrors = true                                    │ │
    │   │                                                                      │ │
    │   │  else                       // Main input (last element)             │ │
    │   │    validationErrors = handleValidationErrorsShape(                   │ │
    │   │      buildValidationErrors(issues),                                  │ │
    │   │      { clientInput, ctx, metadata, ... }                             │ │
    │   │    )                                                                 │ │
    │   └─────────────────────────────────────────────────────────────────────┘ │
    └───────────────────────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
           ▼                               ▼
    ┌─────────────────────┐       ┌─────────────────────┐
    │  Bind Args Errors   │       │  Main Input Errors  │
    │                     │       │                     │
    │  throw ActionBind   │       │  Set middleware     │
    │  ArgsValidation     │       │  Result.validation  │
    │  Error              │       │  Errors             │
    └─────────────────────┘       └─────────────────────┘


    FINAL parsedInputDatas:
    ────────────────────────

    parsedInputDatas = [ parsedBindArg1, parsedBindArg2, parsedMainInput ]
                             ↓                ↓               ↓
                        .slice(0, -1)                    .at(-1)
                             ↓                               ↓
                   bindArgsParsedInputs              parsedInput
```

---

## Diagram 3: Validation Error Object Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Validation Error Object Structure                             │
│                                                                                  │
│   Shows how validation issues are transformed into the error object             │
└─────────────────────────────────────────────────────────────────────────────────┘


    Schema Example:
    ───────────────
    z.object({
      user: z.object({
        name: z.string().min(1),
        email: z.string().email(),
        addresses: z.array(z.object({
          street: z.string(),
          city: z.string()
        }))
      }),
      tags: z.array(z.string())
    })


    Issues from validation failure:
    ───────────────────────────────
    [
      { message: "Required", path: ["user", "name"] },
      { message: "Invalid email", path: ["user", "email"] },
      { message: "Required", path: ["user", "addresses", 0, "street"] },
      { message: "Too short", path: ["tags", 0] },
      { message: "Root error", path: [] }
    ]


    Resulting ValidationErrors object (FORMATTED):
    ───────────────────────────────────────────────

    {
      _errors: ["Root error"],           ← Root-level errors (empty path)
      user: {
        _errors: [],
        name: {
          _errors: ["Required"]          ← Leaf-level error
        },
        email: {
          _errors: ["Invalid email"]     ← Leaf-level error
        },
        addresses: {
          _errors: [],
          0: {                           ← Array index as key
            _errors: [],
            street: {
              _errors: ["Required"]
            }
          }
        }
      },
      tags: {
        _errors: [],
        0: {
          _errors: ["Too short"]
        }
      }
    }


    Tree Visualization:
    ───────────────────

                    ValidationErrors
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
    _errors: [       user: {           tags: {
    "Root error"       │                  │
    ]                  │              0: { _errors: ["Too short"] }
                       │
         ┌─────────────┼─────────────┐
         │             │             │
     name: {       email: {     addresses: {
       _errors:      _errors:         │
       ["Required"]  ["Invalid      0: {
                      email"]          street: {
     }             }                     _errors: ["Required"]
                                       }
                                     }
                                   }
```

---

## Diagram 4: buildValidationErrors() Path Traversal

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   buildValidationErrors() Algorithm                              │
│                                                                                  │
│   Shows how issues are processed and nested into the error object               │
└─────────────────────────────────────────────────────────────────────────────────┘


    Input Issue: { message: "Invalid", path: ["user", "profile", "age"] }
    
    
    STEP 1: Initialize
    ──────────────────
    
    ve = {}    ← Empty validation errors object
    
    
    STEP 2: Check path
    ──────────────────
    
    path = ["user", "profile", "age"]
    path.length = 3  (not empty, not root error)
    
    
    STEP 3: Create nested structure (all but last segment)
    ──────────────────────────────────────────────────────
    
    ref = ve
    
    Loop: i = 0 to path.length - 2 (i.e., 0 and 1)
    
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                           │
    │   i = 0:  key = "user"                                                    │
    │                                                                           │
    │   ve = {}                                                                 │
    │      │                                                                    │
    │      └─ ref["user"] = {}                                                  │
    │                                                                           │
    │   ve = { user: {} }                                                       │
    │   ref = ve.user = {}                                                      │
    │                                                                           │
    └──────────────────────────────────────────────────────────────────────────┘
    
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                           │
    │   i = 1:  key = "profile"                                                 │
    │                                                                           │
    │   ref = {}  (currently ve.user)                                           │
    │      │                                                                    │
    │      └─ ref["profile"] = {}                                               │
    │                                                                           │
    │   ve = { user: { profile: {} } }                                          │
    │   ref = ve.user.profile = {}                                              │
    │                                                                           │
    └──────────────────────────────────────────────────────────────────────────┘
    
    
    STEP 4: Set error at final key
    ──────────────────────────────
    
    key = path[path.length - 1] = "age"
    ref = ve.user.profile = {}
    
    ref["age"] = { _errors: ["Invalid"] }
    
    
    FINAL RESULT:
    ─────────────
    
    ve = {
      user: {
        profile: {
          age: {
            _errors: ["Invalid"]
          }
        }
      }
    }


    CODE IMPLEMENTATION:
    ────────────────────

    ```typescript
    export const buildValidationErrors = <S>(issues: readonly Issue[]) => {
      const ve: any = {};

      for (const issue of issues) {
        const { path, message } = issue;

        // Root error (no path)
        if (!path || path.length === 0) {
          ve._errors = ve._errors ? [...ve._errors, message] : [message];
          continue;
        }

        // Reference for traversal
        let ref = ve;

        // Create nested objects for all but last segment
        for (let i = 0; i < path.length - 1; i++) {
          const k = getKey(path[i]!);
          if (!ref[k]) {
            ref[k] = {};
          }
          ref = ref[k];
        }

        // Set error at final key
        const key = getKey(path[path.length - 1]!);
        ref[key] = ref[key]?._errors
          ? { ...ref[key], _errors: [...ref[key]._errors, message] }
          : { ...ref[key], _errors: [message] };
      }

      return ve as ValidationErrors<S>;
    };
    ```
```

---

## Diagram 5: Error Type Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Error Type Hierarchy                                     │
│                                                                                  │
│   All custom error classes that the library uses                                │
└─────────────────────────────────────────────────────────────────────────────────┘


                                    Error (built-in)
                                         │
                                         │ extends
                                         │
         ┌───────────────────────────────┼───────────────────────────────┐
         │                               │                               │
         │                               │                               │
         ▼                               ▼                               ▼
┌─────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ActionServerValidation│   │   ActionValidation      │    │ActionBindArgsValidation │
│      Error          │    │       Error             │    │        Error            │
│                     │    │                         │    │                         │
│ Used internally by  │    │ Thrown to client when   │    │ Thrown when bind args   │
│ returnValidation    │    │ throwValidationErrors   │    │ fail validation         │
│ Errors()            │    │ is enabled              │    │                         │
│                     │    │                         │    │ Contains array of       │
│ Properties:         │    │ Properties:             │    │ validation errors       │
│ - validationErrors  │    │ - validationErrors      │    │                         │
│   (ValidationErrors)│    │   (CVE - custom shape)  │    │ Properties:             │
│                     │    │                         │    │ - validationErrors[]    │
└─────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
         │
         │ Caught and transformed to
         │ middlewareResult.validationErrors
         ▼


┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                          Metadata & Output Errors                                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────────────────────┐
         │                                                          │
         ▼                                                          ▼
┌─────────────────────────┐                          ┌─────────────────────────┐
│ActionMetadataValidation │                          │ActionOutputDataValidation│
│        Error            │                          │         Error           │
│                         │                          │                         │
│ Thrown when metadata    │                          │ Thrown when server code │
│ doesn't match the       │                          │ return value doesn't    │
│ defineMetadataSchema()  │                          │ match outputSchema      │
│                         │                          │                         │
│ Message:                │                          │ Message:                │
│ "Invalid metadata       │                          │ "Invalid action data    │
│  input..."              │                          │  (output)..."           │
│                         │                          │                         │
│ Properties:             │                          │ Properties:             │
│ - validationErrors      │                          │ - validationErrors      │
└─────────────────────────┘                          └─────────────────────────┘


    WHEN EACH ERROR IS THROWN:
    ──────────────────────────

    ┌───────────────────────────────────────────────────────────────────────────┐
    │                                                                            │
    │   Timeline of Action Execution                                             │
    │                                                                            │
    │   ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐     │
    │   │Metadata│───▶│Middleware──▶│  Input │───▶│ Server │───▶│ Output │     │
    │   │Validate│    │  Stack │    │Validate│    │  Code  │    │Validate│     │
    │   └───┬────┘    └────────┘    └───┬────┘    └───┬────┘    └───┬────┘     │
    │       │                           │             │             │           │
    │       ▼                           ▼             ▼             ▼           │
    │   ActionMetadata           ActionBindArgs    ActionServer  ActionOutput  │
    │   ValidationError          ValidationError   Validation    DataValidation│
    │                            (bind args)       Error         Error         │
    │                                              (returnValidation           │
    │                            ActionValidation   Errors called)             │
    │                            Error                                         │
    │                            (main input,                                  │
    │                             if throw enabled)                            │
    │                                                                            │
    └───────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 6: Formatted vs Flattened Validation Errors

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  Formatted vs Flattened Validation Errors                        │
│                                                                                  │
│   Two ways to shape validation errors - set via defaultValidationErrorsShape    │
└─────────────────────────────────────────────────────────────────────────────────┘


    Input Schema:
    ─────────────
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      profile: z.object({
        name: z.string()
      })
    })


    Validation Issues:
    ──────────────────
    [
      { message: "Form is incomplete", path: [] },           // Root error
      { message: "Invalid email format", path: ["email"] },
      { message: "Too short", path: ["password"] },
      { message: "Required", path: ["profile", "name"] }
    ]


    ┌─────────────────────────────────────────┬────────────────────────────────────┐
    │                                         │                                     │
    │           FORMATTED (default)           │              FLATTENED              │
    │                                         │                                     │
    │   formatValidationErrors(ve)            │     flattenValidationErrors(ve)     │
    │                                         │                                     │
    ├─────────────────────────────────────────┼────────────────────────────────────┤
    │                                         │                                     │
    │   {                                     │   {                                 │
    │     _errors: [                          │     formErrors: [                   │
    │       "Form is incomplete"              │       "Form is incomplete"          │
    │     ],                                  │     ],                              │
    │     email: {                            │     fieldErrors: {                  │
    │       _errors: [                        │       email: [                      │
    │         "Invalid email format"          │         "Invalid email format"      │
    │       ]                                 │       ],                            │
    │     },                                  │       password: [                   │
    │     password: {                         │         "Too short"                 │
    │       _errors: [                        │       ]                             │
    │         "Too short"                     │       // NOTE: profile.name         │
    │       ]                                 │       // is NOT included!           │
    │     },                                  │       // (nested fields discarded)  │
    │     profile: {                          │     }                               │
    │       _errors: [],                      │   }                                 │
    │       name: {                           │                                     │
    │         _errors: [                      │                                     │
    │           "Required"                    │                                     │
    │         ]                               │                                     │
    │       }                                 │                                     │
    │     }                                   │                                     │
    │   }                                     │                                     │
    │                                         │                                     │
    └─────────────────────────────────────────┴────────────────────────────────────┘


    VISUAL COMPARISON:
    ──────────────────

    FORMATTED:                              FLATTENED:
    ──────────                              ─────────

         ValidationErrors                        FlattenedValidationErrors
              │                                          │
     ┌────────┼────────┬──────────┐           ┌──────────┴──────────┐
     │        │        │          │           │                     │
  _errors   email   password   profile    formErrors           fieldErrors
     │        │        │          │           │                     │
  ["Form.."] │        │     ┌────┴────┐    ["Form.."]        ┌─────┴─────┐
          _errors  _errors  │         │                      │           │
             │        │   _errors   name                   email      password
        ["Invalid"] ["Too    │        │                      │           │
                    short"] []     _errors              ["Invalid"] ["Too short"]
                                     │
                                ["Required"]


    USE CASES:
    ──────────

    FORMATTED is better for:
    • Deeply nested forms
    • Field-level error display next to inputs
    • Complex validation rules

    FLATTENED is better for:
    • Simple forms (single level)
    • Displaying all errors in one place
    • API responses where simplicity matters
```

---

## returnValidationErrors() - Manual Validation Errors

The `returnValidationErrors()` function allows you to return validation errors from within your server code, even after schema validation passes.

```typescript
// validation-errors.ts
export function returnValidationErrors<
  S extends StandardSchemaV1 | (() => Promise<StandardSchemaV1>),
  AS extends StandardSchemaV1 = S extends () => Promise<StandardSchemaV1> 
    ? Awaited<ReturnType<S>> 
    : S,
>(schema: S, validationErrors: ValidationErrors<AS>): never {
  throw new ActionServerValidationError<AS>(validationErrors);
}
```

### Flow Diagram

```
    Server Code Function
           │
           ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                                                              │
    │   async ({ parsedInput }) => {                               │
    │     // Schema validation already passed                      │
    │                                                              │
    │     // Check business logic                                  │
    │     const emailExists = await checkEmail(parsedInput.email); │
    │                                                              │
    │     if (emailExists) {                                       │
    │       returnValidationErrors(schema, {                       │
    │         email: {                                             │
    │           _errors: ["Email already registered"]              │
    │         }                                                    │
    │       });                                                    │
    │       // Code after this NEVER executes (throws)             │
    │     }                                                        │
    │                                                              │
    │     // Continue with normal logic...                         │
    │   }                                                          │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
           │
           │ throws ActionServerValidationError
           ▼
    ┌─────────────────────────────────────────────────────────────┐
    │   Caught in action-builder.ts catch block                    │
    │                                                              │
    │   if (e instanceof ActionServerValidationError) {            │
    │     middlewareResult.validationErrors = await                │
    │       handleValidationErrorsShape(e.validationErrors, ...)   │
    │   }                                                          │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
           │
           ▼
    ┌─────────────────────────────────────────────────────────────┐
    │   Returned to client as:                                     │
    │                                                              │
    │   {                                                          │
    │     validationErrors: {                                      │
    │       email: { _errors: ["Email already registered"] }       │
    │     }                                                        │
    │   }                                                          │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
```

---

## Server Error Handling

### handleServerError Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Server Error Handling Flow                               │
└─────────────────────────────────────────────────────────────────────────────────┘

    Server Code throws Error
           │
           ▼
    ┌─────────────────────────────────────────────────────────────┐
    │   Error caught in action-builder.ts                          │
    │                                                              │
    │   } catch (e: unknown) {                                     │
    │     // Check if server error already handled                 │
    │     if (serverErrorHandled) throw e;                         │
    └─────────────────────────────────────────────────────────────┘
           │
           │ Is it a known error type?
           ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                           │
    │  ┌─────────────────────────┐    ┌─────────────────────────────────────┐  │
    │  │ ActionServerValidation  │    │      Other Errors                    │  │
    │  │ Error                   │    │                                      │  │
    │  │                         │    │                                      │  │
    │  │ Transform to validation │    │  1. Mark serverErrorHandled = true   │  │
    │  │ errors (see above)      │    │                                      │  │
    │  └─────────────────────────┘    │  2. Wrap non-Error objects:          │  │
    │                                 │     const error = isError(e)          │  │
    │                                 │       ? e                             │  │
    │                                 │       : new Error(DEFAULT_MESSAGE)    │  │
    │                                 │                                      │  │
    │                                 │  3. Call handleServerError:          │  │
    │                                 │     const returnedError = await      │  │
    │                                 │       handleServerError(error, {     │  │
    │                                 │         clientInput,                 │  │
    │                                 │         bindArgsClientInputs,        │  │
    │                                 │         ctx,                         │  │
    │                                 │         metadata                     │  │
    │                                 │       })                             │  │
    │                                 │                                      │  │
    │                                 │  4. Set result:                      │  │
    │                                 │     middlewareResult.serverError =   │  │
    │                                 │       returnedError                  │  │
    │                                 └─────────────────────────────────────┘  │
    │                                                                           │
    └──────────────────────────────────────────────────────────────────────────┘


    DEFAULT handleServerError:
    ──────────────────────────

    (e) => {
      console.error("Action error:", e.message);  // Log to server console
      return DEFAULT_SERVER_ERROR_MESSAGE;        // "Something went wrong..."
    }


    CUSTOM handleServerError Example:
    ─────────────────────────────────

    createSafeActionClient({
      handleServerError: (e, { metadata }) => {
        // Log with context
        console.error(`[${metadata.actionName}] Error:`, e.message);
        
        // Track in error monitoring
        Sentry.captureException(e);
        
        // Return custom error type
        if (e instanceof AuthError) {
          return { code: "AUTH_ERROR", message: "Please login again" };
        }
        
        if (e instanceof ValidationError) {
          return { code: "VALIDATION_ERROR", message: e.message };
        }
        
        // Default
        return { code: "UNKNOWN", message: "An error occurred" };
      }
    });
```

---

## throwValidationErrors and throwServerError Options

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    Error Throwing vs Returning                                   │
│                                                                                  │
│   Two ways to handle errors: return in result object OR throw                   │
└─────────────────────────────────────────────────────────────────────────────────┘


    DEFAULT BEHAVIOR (return in result):
    ────────────────────────────────────

    const result = await action({ invalid: "data" });
    
    result = {
      validationErrors: { ... },  // Errors in result object
      serverError: undefined,
      data: undefined
    }
    
    // Client must check result.validationErrors


    WITH throwValidationErrors: true
    ────────────────────────────────

    // Set at client level:
    createSafeActionClient({
      throwValidationErrors: true
    })

    // OR at action level (higher priority):
    .action(serverCodeFn, {
      throwValidationErrors: true
    })

    // Now validation errors are thrown:
    try {
      const result = await action({ invalid: "data" });
    } catch (e) {
      if (e instanceof ActionValidationError) {
        console.log(e.validationErrors);  // Access errors here
      }
    }


    WITH throwServerError: true
    ──────────────────────────

    // Set at action level only:
    .action(serverCodeFn, {
      throwServerError: true
    })

    // Now server errors are thrown:
    try {
      const result = await action({ ... });
    } catch (e) {
      // e is the serverError (after handleServerError processing)
    }


    PRIORITY DIAGRAM:
    ─────────────────

    throwValidationErrors priority:

    ┌───────────────────────────────────────────────────────────────┐
    │                                                                │
    │   Client Level          Action Level          Final Value     │
    │   (createSafe           (.action({ throw     (used)           │
    │    ActionClient)         ValidationErrors }))                 │
    │                                                                │
    │   ┌─────────┐           ┌─────────┐          ┌─────────┐     │
    │   │  true   │     +     │undefined│    =     │  true   │     │
    │   └─────────┘           └─────────┘          └─────────┘     │
    │                                                                │
    │   ┌─────────┐           ┌─────────┐          ┌─────────┐     │
    │   │  true   │     +     │  false  │    =     │  false  │     │ ← Action level wins
    │   └─────────┘           └─────────┘          └─────────┘     │
    │                                                                │
    │   ┌─────────┐           ┌─────────┐          ┌─────────┐     │
    │   │  false  │     +     │  true   │    =     │  true   │     │ ← Action level wins
    │   └─────────┘           └─────────┘          └─────────┘     │
    │                                                                │
    └───────────────────────────────────────────────────────────────┘

    Implementation (winningBoolean utility):

    ```typescript
    // utils.ts
    export const winningBoolean = (...args: (boolean | undefined | null)[]) => {
      return args.reduce((acc, v) => 
        (typeof v === "boolean" ? v : acc), 
        false
      ) as boolean;
    };
    ```
```

---

## Custom Validation Error Shapes

You can provide a custom function to reshape validation errors:

```typescript
const action = createSafeActionClient()
  .inputSchema(
    z.object({ email: z.string().email() }),
    {
      handleValidationErrorsShape: async (validationErrors, { clientInput }) => {
        // Transform to your preferred shape
        return {
          errors: Object.entries(validationErrors)
            .filter(([key]) => key !== "_errors")
            .map(([field, value]) => ({
              field,
              messages: (value as any)._errors
            })),
          input: clientInput
        };
      }
    }
  );

// Result shape:
{
  validationErrors: {
    errors: [
      { field: "email", messages: ["Invalid email"] }
    ],
    input: { email: "invalid" }
  }
}
```

---

## Summary: Error Types Quick Reference

| Error Type | When Thrown | Contains | Caught By |
|------------|-------------|----------|-----------|
| `ActionMetadataValidationError` | Metadata doesn't match schema | `validationErrors` | Internal (throws to user) |
| `ActionValidationError` | Input validation fails + `throwValidationErrors: true` | `validationErrors` (CVE shape) | Client code |
| `ActionServerValidationError` | `returnValidationErrors()` called | `validationErrors` | Internal (converted to result) |
| `ActionBindArgsValidationError` | Bind args fail validation | `validationErrors[]` | Internal (throws to user) |
| `ActionOutputDataValidationError` | Output doesn't match schema | `validationErrors` | Internal (throws to user) |
| Server Error | Any other error in server code | Processed by `handleServerError` | Internal (converted to result) |
