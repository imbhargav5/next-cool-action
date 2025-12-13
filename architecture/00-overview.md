# next-cool-action Architecture Overview

## Introduction

`next-cool-action` is a type-safe server action library for Next.js applications. It provides a robust framework for defining, validating, and executing server actions with full TypeScript support, middleware capabilities, and React hooks integration.

---

## Diagram 1: High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT SIDE (Browser)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────┐                 │
│  │   useAction  │    │useOptimistic │    │   useStateAction   │                 │
│  │     Hook     │    │ Action Hook  │    │       Hook         │                 │
│  └──────┬───────┘    └──────┬───────┘    └─────────┬──────────┘                 │
│         │                   │                      │                             │
│         └───────────────────┼──────────────────────┘                             │
│                             │                                                    │
│                             ▼                                                    │
│                   ┌──────────────────┐                                           │
│                   │  execute() or    │                                           │
│                   │  executeAsync()  │                                           │
│                   └────────┬─────────┘                                           │
│                            │                                                     │
└────────────────────────────┼─────────────────────────────────────────────────────┘
                             │
                             │  HTTP Request (Server Action Call)
                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVER SIDE (Next.js)                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        SafeActionClient                                   │   │
│  │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────────┐           │   │
│  │  │  use()  │─▶│metadata()│─▶│inputSchema()│─▶│   action()   │           │   │
│  │  └─────────┘  └──────────┘  └─────────────┘  └──────────────┘           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                          Action Builder                                   │   │
│  │                                                                           │   │
│  │   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │   │
│  │   │  Middleware │───▶│  Validation │───▶│ Server Code │                  │   │
│  │   │    Stack    │    │   (Schema)  │    │  Function   │                  │   │
│  │   └─────────────┘    └─────────────┘    └─────────────┘                  │   │
│  │                                                                           │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                           │
│                                      ▼                                           │
│                        ┌─────────────────────────┐                               │
│                        │   SafeActionResult      │                               │
│                        │  { data, serverError,   │                               │
│                        │    validationErrors }   │                               │
│                        └─────────────────────────┘                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 2: Module Dependency Graph

```
                                    ┌─────────────────┐
                                    │    index.ts     │
                                    │  (Entry Point)  │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
                    ▼                        ▼                        ▼
        ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐
        │ safe-action-      │    │   validation-     │    │    middleware.ts  │
        │ client.ts         │    │   errors.ts       │    │                   │
        └─────────┬─────────┘    └─────────┬─────────┘    └───────────────────┘
                  │                        │
                  │                        │
                  ▼                        ▼
        ┌───────────────────┐    ┌───────────────────┐
        │  action-builder   │    │ validation-errors │
        │       .ts         │◀───│     .types.ts     │
        └─────────┬─────────┘    └───────────────────┘
                  │
       ┌──────────┼──────────┐
       │          │          │
       ▼          ▼          ▼
┌────────────┐ ┌────────┐ ┌────────────────┐
│  standard- │ │utils.ts│ │  next/errors/  │
│  schema.ts │ │        │ │   index.ts     │
└────────────┘ └────────┘ └────────────────┘


                    CLIENT-SIDE MODULES
                    ───────────────────

                    ┌─────────────────┐
                    │    hooks.ts     │
                    │  (Entry Point)  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────────┐ ┌─────────┐ ┌──────────────────┐
    │  hooks-utils.ts │ │hooks.   │ │stateful-hooks.ts │
    │                 │ │types.ts │ │                  │
    └─────────────────┘ └─────────┘ └──────────────────┘
```

---

## Diagram 3: Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           PRESENTATION LAYER                                 │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         React Hooks                                     │ │
│  │                                                                         │ │
│  │   useAction()      useOptimisticAction()      useStateAction()         │ │
│  │                                                                         │ │
│  │   • State management (result, status, input)                           │ │
│  │   • Callbacks (onSuccess, onError, onSettled, onNavigation)            │ │
│  │   • execute() / executeAsync() methods                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                            CLIENT LAYER                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      SafeActionClient                                   │ │
│  │                                                                         │ │
│  │   • Builder pattern for action configuration                           │ │
│  │   • Middleware registration (use())                                    │ │
│  │   • Schema definition (inputSchema, outputSchema, bindArgsSchemas)     │ │
│  │   • Metadata configuration                                             │ │
│  │   • Action/StateAction definition                                      │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                           EXECUTION LAYER                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        Action Builder                                   │ │
│  │                                                                         │ │
│  │   • Middleware stack execution                                         │ │
│  │   • Input/output validation                                            │ │
│  │   • Server code invocation                                             │ │
│  │   • Error handling                                                     │ │
│  │   • Callback execution                                                 │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                       │
└──────────────────────────────────────┼───────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                          VALIDATION LAYER                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                     Standard Schema                                     │ │
│  │                                                                         │ │
│  │   • Library-agnostic validation (Zod, Valibot, ArkType, etc.)         │ │
│  │   • Input parsing                                                      │ │
│  │   • Output validation                                                  │ │
│  │   • Validation error building                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 4: Request/Response Lifecycle

```
    CLIENT                                                           SERVER
      │                                                                │
      │  1. User triggers action                                       │
      │  ─────────────────────────────────────────────────────────▶   │
      │     execute({ userId: "123" })                                 │
      │                                                                │
      │                                           2. Metadata validation
      │                                              ┌─────────────────┤
      │                                              │  Validate       │
      │                                              │  metadata       │
      │                                              │  schema         │
      │                                              └────────┬────────┤
      │                                                       │        │
      │                                           3. Middleware execution
      │                                              ┌────────▼────────┤
      │                                              │  middleware1    │
      │                                              │      │          │
      │                                              │      ▼          │
      │                                              │  middleware2    │
      │                                              │      │          │
      │                                              │      ▼          │
      │                                              │  middlewareN    │
      │                                              └────────┬────────┤
      │                                                       │        │
      │                                           4. Input validation
      │                                              ┌────────▼────────┤
      │                                              │  Parse input    │
      │                                              │  with schema    │
      │                                              │                 │
      │                                              │  Parse bind     │
      │                                              │  args schemas   │
      │                                              └────────┬────────┤
      │                                                       │        │
      │                                           5. Server code execution
      │                                              ┌────────▼────────┤
      │                                              │  Run server     │
      │                                              │  code function  │
      │                                              │                 │
      │                                              │  async ({       │
      │                                              │    parsedInput, │
      │                                              │    ctx,         │
      │                                              │    metadata     │
      │                                              │  }) => { ... }  │
      │                                              └────────┬────────┤
      │                                                       │        │
      │                                           6. Output validation
      │                                              ┌────────▼────────┤
      │                                              │  Validate       │
      │                                              │  output with    │
      │                                              │  outputSchema   │
      │                                              └────────┬────────┤
      │                                                       │        │
      │                                           7. Callbacks execution
      │                                              ┌────────▼────────┤
      │                                              │  onSuccess /    │
      │                                              │  onError /      │
      │                                              │  onSettled      │
      │                                              └────────┬────────┤
      │                                                       │        │
      │  8. Response returned                                 │        │
      │  ◀─────────────────────────────────────────────────────        │
      │     { data: { ... }, serverError?, validationErrors? }         │
      │                                                                │
      │  9. Client callbacks executed                                  │
      │     ┌──────────────────┐                                       │
      │     │ onSuccess()      │                                       │
      │     │ onError()        │                                       │
      │     │ onSettled()      │                                       │
      │     └──────────────────┘                                       │
      │                                                                │
```

---

## Diagram 5: Component Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                            EXPORTS (index.ts)                                    │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │  Functions:                        Classes & Errors:                     │   │
│   │  ─────────                         ──────────────────                    │   │
│   │  • createSafeActionClient()        • ActionValidationError               │   │
│   │  • createMiddleware()              • ActionBindArgsValidationError       │   │
│   │  • flattenValidationErrors()       • ActionMetadataValidationError       │   │
│   │  • formatValidationErrors()        • ActionOutputDataValidationError     │   │
│   │  • returnValidationErrors()                                              │   │
│   │                                                                          │   │
│   │  Constants:                        Types (exported):                     │   │
│   │  ──────────                        ─────────────────                     │   │
│   │  • DEFAULT_SERVER_ERROR_MESSAGE    • SafeActionResult                    │   │
│   │                                    • SafeActionFn                        │   │
│   │                                    • SafeStateActionFn                   │   │
│   │                                    • MiddlewareFn                        │   │
│   │                                    • ValidationErrors                    │   │
│   │                                    • (+ many more...)                    │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                                        │
                         Uses / Creates │
                                        ▼

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                           SafeActionClient                                       │
│                                                                                  │
│   ┌───────────────────────────────────────────────────────────────────────┐     │
│   │                                                                        │     │
│   │  Private State (#args):                                                │     │
│   │  ──────────────────────                                                │     │
│   │  • middlewareFns[]          Middleware function chain                  │     │
│   │  • handleServerError        Error handler function                     │     │
│   │  • inputSchemaFn            Input validation schema function           │     │
│   │  • bindArgsSchemas[]        Bind arguments schemas                     │     │
│   │  • outputSchema             Output validation schema                   │     │
│   │  • metadataSchema           Metadata validation schema                 │     │
│   │  • metadata                 Action metadata                            │     │
│   │  • handleValidationErrorsShape   Validation error formatter            │     │
│   │  • throwValidationErrors    Throw vs return validation errors          │     │
│   │                                                                        │     │
│   │  Public Methods:                                                       │     │
│   │  ───────────────                                                       │     │
│   │  • use(middlewareFn)        → new SafeActionClient (extended)          │     │
│   │  • metadata(data)           → new SafeActionClient (with metadata)     │     │
│   │  • inputSchema(schema)      → new SafeActionClient (with input)        │     │
│   │  • bindArgsSchemas(schemas) → new SafeActionClient (with bind args)    │     │
│   │  • outputSchema(schema)     → new SafeActionClient (with output)       │     │
│   │  • action(serverCodeFn)     → SafeActionFn (callable function)         │     │
│   │  • stateAction(serverCodeFn)→ SafeStateActionFn (stateful function)    │     │
│   │                                                                        │     │
│   └───────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                                        │
                        Delegates to    │
                                        ▼

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│                            actionBuilder()                                       │
│                                                                                  │
│   ┌───────────────────────────────────────────────────────────────────────┐     │
│   │                                                                        │     │
│   │  Creates async function that:                                          │     │
│   │                                                                        │     │
│   │  1. Executes middleware stack via executeMiddlewareStack()             │     │
│   │     • Validates metadata (if schema exists)                            │     │
│   │     • Runs each middleware with next() chain                           │     │
│   │     • Accumulates context (ctx) through chain                          │     │
│   │                                                                        │     │
│   │  2. Validates inputs                                                   │     │
│   │     • Parses main input with inputSchema                               │     │
│   │     • Parses bind args with bindArgsSchemas                            │     │
│   │     • Builds validation errors if parsing fails                        │     │
│   │                                                                        │     │
│   │  3. Executes server code function                                      │     │
│   │     • Passes { parsedInput, bindArgsParsedInputs, ctx, metadata }      │     │
│   │     • For stateAction: also passes { prevResult }                      │     │
│   │                                                                        │     │
│   │  4. Validates output (if outputSchema exists)                          │     │
│   │                                                                        │     │
│   │  5. Handles errors                                                     │     │
│   │     • Framework errors (redirect, notFound, etc.)                      │     │
│   │     • Server errors → handleServerError()                              │     │
│   │     • Validation errors → handleValidationErrorsShape()                │     │
│   │                                                                        │     │
│   │  6. Executes callbacks                                                 │     │
│   │     • onSuccess / onError / onSettled / onNavigation                   │     │
│   │                                                                        │     │
│   │  7. Returns SafeActionResult                                           │     │
│   │     • { data?, serverError?, validationErrors? }                       │     │
│   │                                                                        │     │
│   └───────────────────────────────────────────────────────────────────────┘     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. SafeActionClient
The central class that provides a **builder pattern** for configuring and creating type-safe server actions. Each method returns a new instance, allowing for immutable chaining while preserving TypeScript type inference.

### 2. Middleware System
A powerful middleware system that allows you to:
- Add authentication/authorization
- Log requests
- Modify context
- Transform inputs/outputs

Middleware functions receive `{ clientInput, bindArgsClientInputs, ctx, metadata, next }` and must call `next()` to continue the chain.

### 3. Standard Schema
The library uses the [Standard Schema](https://github.com/standard-schema/standard-schema) specification, making it **validation library agnostic**. You can use Zod, Valibot, ArkType, or any Standard Schema-compliant library.

### 4. Validation Errors
Two formats are supported:
- **Formatted** (default): Nested object structure with `_errors` arrays
- **Flattened**: Simple `{ formErrors, fieldErrors }` structure

### 5. React Hooks
Three hooks for different use cases:
- `useAction`: Standard hook for action execution
- `useOptimisticAction`: For optimistic UI updates
- `useStateAction`: For form actions (deprecated, use React's `useActionState`)

### 6. Error Handling
The library distinguishes between:
- **Validation errors**: Schema validation failures
- **Server errors**: Exceptions in server code
- **Navigation errors**: Next.js redirects, notFound, forbidden, etc.

---

## File Structure

```
packages/next-cool-action/src/
├── index.ts                    # Main entry point, exports createSafeActionClient
├── index.types.ts              # Core type definitions
├── safe-action-client.ts       # SafeActionClient builder class
├── action-builder.ts           # Action execution engine
├── middleware.ts               # createMiddleware utility
├── standard-schema.ts          # Standard Schema interface & parsing
├── validation-errors.ts        # Validation error utilities
├── validation-errors.types.ts  # Validation error types
├── hooks.ts                    # useAction, useOptimisticAction hooks
├── hooks-utils.ts              # Hook utility functions
├── hooks.types.ts              # Hook type definitions
├── stateful-hooks.ts           # useStateAction hook
├── utils.ts                    # Utility functions
├── utils.types.ts              # Utility types
└── next/
    └── errors/                 # Next.js error handling
        ├── index.ts            # FrameworkErrorHandler class
        ├── redirect.ts         # Redirect error detection
        ├── http-access-fallback.ts  # notFound, forbidden, unauthorized
        ├── bailout-to-csr.ts   # CSR bailout detection
        ├── dynamic-usage.ts    # Dynamic usage error
        ├── postpone.ts         # Postpone detection
        └── router.ts           # Router error detection
```

---

## Quick Start Example

```typescript
// 1. Create the client (safe-action.ts)
import { createSafeActionClient } from "next-cool-action";

export const action = createSafeActionClient();

// 2. Define an action (delete-user.ts)
"use server";

import { z } from "zod";
import { action } from "./safe-action";

export const deleteUser = action
  .inputSchema(z.object({ userId: z.string().uuid() }))
  .action(async ({ parsedInput }) => {
    // Delete user logic...
    return { success: true, deletedId: parsedInput.userId };
  });

// 3. Use in a component (page.tsx)
"use client";

import { useAction } from "next-cool-action/hooks";
import { deleteUser } from "./delete-user";

export default function Page() {
  const { execute, result, isExecuting } = useAction(deleteUser);

  return (
    <button onClick={() => execute({ userId: "123" })} disabled={isExecuting}>
      {isExecuting ? "Deleting..." : "Delete User"}
    </button>
  );
}
```

---

## Next Steps

- **[01-server-side.md](./01-server-side.md)**: Deep dive into server-side architecture
- **[02-validation.md](./02-validation.md)**: Validation and error handling
- **[03-client-side.md](./03-client-side.md)**: React hooks documentation
- **[04-data-flow.md](./04-data-flow.md)**: End-to-end data flow examples
- **[05-types-core.md](./05-types-core.md)**: Core TypeScript types explained
- **[06-types-advanced.md](./06-types-advanced.md)**: Advanced TypeScript patterns
