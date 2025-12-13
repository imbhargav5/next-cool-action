# Server-Side Architecture

This document covers the server-side components of `next-cool-action`, including the client creation, builder pattern, middleware system, and action execution.

---

## Diagram 1: createCoolActionClient() Initialization Flow

```
                    createCoolActionClient(options?)
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │         Process Options                 │
         │                                         │
         │  options = {                            │
         │    handleServerError?,                  │
         │    defineMetadataSchema?,               │
         │    defaultValidationErrorsShape?,       │
         │    throwValidationErrors?               │
         │  }                                      │
         └────────────────────┬───────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
    ┌─────────────────────┐       ┌─────────────────────┐
    │ handleServerError   │       │ No handleServerError│
    │ provided?           │       │ provided            │
    │                     │       │                     │
    │ Use custom handler  │       │ Use default:        │
    └──────────┬──────────┘       │ console.error() +   │
               │                  │ DEFAULT_SERVER_     │
               │                  │ ERROR_MESSAGE       │
               │                  └──────────┬──────────┘
               │                             │
               └──────────────┬──────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │    Create CoolActionClient Instance    │
         │                                         │
         │  new CoolActionClient({                 │
         │    middlewareFns: [                     │
         │      async ({ next }) => next({ ctx: {} })  ← Initial empty middleware
         │    ],                                   │
         │    handleServerError,                   │
         │    inputSchemaFn: undefined,            │
         │    bindArgsSchemas: [],                 │
         │    outputSchema: undefined,             │
         │    ctxType: {},                         │
         │    metadataSchema,                      │
         │    metadata: undefined,                 │
         │    defaultValidationErrorsShape,        │
         │    throwValidationErrors,               │
         │    handleValidationErrorsShape          │
         │  })                                     │
         └────────────────────────────────────────┘
                              │
                              ▼
                   ┌───────────────────┐
                   │  CoolActionClient │
                   │     Instance      │
                   └───────────────────┘
```

### Code Reference

```typescript
// index.ts - createCoolActionClient function
export const createCoolActionClient = <
  ODVES extends DVES | undefined = undefined,
  ServerError = string,
  MetadataSchema extends StandardSchemaV1 | undefined = undefined,
>(createOpts?: CreateClientOpts<ODVES, ServerError, MetadataSchema>) => {
  
  // Default error handler: log to console, return generic message
  const handleServerError: HandleServerErrorFn<ServerError, MetadataSchema> =
    createOpts?.handleServerError ||
    ((e) => {
      console.error("Action error:", e.message);
      return DEFAULT_SERVER_ERROR_MESSAGE as ServerError;
    });

  return new CoolActionClient({
    middlewareFns: [async ({ next }) => next({ ctx: {} })],  // Initial middleware
    handleServerError,
    inputSchemaFn: undefined,
    bindArgsSchemas: [],
    outputSchema: undefined,
    ctxType: {},
    metadataSchema: (createOpts?.defineMetadataSchema?.() ?? undefined),
    metadata: undefined,
    defaultValidationErrorsShape: createOpts?.defaultValidationErrorsShape ?? "formatted",
    throwValidationErrors: Boolean(createOpts?.throwValidationErrors),
    handleValidationErrorsShape: async (ve) =>
      createOpts?.defaultValidationErrorsShape === "flattened"
        ? flattenValidationErrors(ve)
        : formatValidationErrors(ve),
  });
};
```

---

## Diagram 2: CoolActionClient Builder Chain Visualization

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CoolActionClient Builder Pattern                         │
│                                                                                  │
│  Each method returns a NEW CoolActionClient instance with updated configuration │
│  This enables type inference to track accumulated types through the chain       │
└─────────────────────────────────────────────────────────────────────────────────┘

    createCoolActionClient()
            │
            │  Returns: CoolActionClient<string, undefined, undefined, ...>
            ▼
    ┌───────────────────┐
    │  CoolActionClient │─── #args (private state)
    │     Instance 1    │    { middlewareFns: [...], ctx: {} }
    └─────────┬─────────┘
              │
              │ .use(authMiddleware)
              │
              │ Returns: CoolActionClient<string, undefined, undefined, ..., { userId: string }>
              ▼
    ┌───────────────────┐
    │  CoolActionClient │─── #args (NEW state)
    │     Instance 2    │    { middlewareFns: [..., authMiddleware], ctx: { userId } }
    └─────────┬─────────┘
              │
              │ .metadata({ actionName: "test" })
              │
              │ Returns: CoolActionClient<..., MD = { actionName: string }, MDProvided = true>
              ▼
    ┌───────────────────┐
    │  CoolActionClient │─── #args
    │     Instance 3    │    { ..., metadata: { actionName: "test" } }
    └─────────┬─────────┘
              │
              │ .inputSchema(z.object({ userId: z.string() }))
              │
              │ Returns: CoolActionClient<..., IS = { userId: string }>
              ▼
    ┌───────────────────┐
    │  CoolActionClient │─── #args
    │     Instance 4    │    { ..., inputSchemaFn: () => schema }
    └─────────┬─────────┘
              │
              │ .outputSchema(z.object({ success: z.boolean() }))
              │
              │ Returns: CoolActionClient<..., OS = { success: boolean }>
              ▼
    ┌───────────────────┐
    │  CoolActionClient │─── #args
    │     Instance 5    │    { ..., outputSchema: schema }
    └─────────┬─────────┘
              │
              │ .action(async ({ parsedInput, ctx }) => { ... })
              │
              │ Returns: CoolActionFn (the actual callable function)
              ▼
    ┌─────────────────────────────────────────┐
    │           CoolActionFn                   │
    │  (input: { userId: string }) =>          │
    │    Promise<CoolActionResult<...>>        │
    └─────────────────────────────────────────┘
```

---

## Diagram 3: Method Chaining - Available Methods at Each Step

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Method Chaining Flow                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

createCoolActionClient()
         │
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    Initial Client                                │
    │                                                                  │
    │  Available methods:                                              │
    │  ┌─────────────┐ ┌──────────────┐ ┌─────────────────┐          │
    │  │   use()     │ │  metadata()  │ │  inputSchema()  │          │
    │  └──────┬──────┘ └──────┬───────┘ └────────┬────────┘          │
    │         │               │                  │                    │
    │  ┌──────┴──────┐ ┌──────┴───────┐ ┌────────┴────────┐          │
    │  │bindArgsSchemas│ │outputSchema()│ │    action()    │          │
    │  └─────────────┘ └──────────────┘ └────────────────┘          │
    │                                    │   stateAction() │          │
    │                                    └─────────────────┘          │
    └─────────────────────────────────────────────────────────────────┘
         │
         │  .use(middleware)  ← Can be called multiple times
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                  Client with Middleware                          │
    │                                                                  │
    │  Context type is extended with each .use() call                 │
    │  Ctx = {} → Ctx = { userId } → Ctx = { userId, sessionId }      │
    │                                                                  │
    │  Same methods available (can add more middleware)                │
    └─────────────────────────────────────────────────────────────────┘
         │
         │  .metadata({ actionName: "deleteUser" })
         │  (REQUIRED if metadataSchema was defined in createCoolActionClient)
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                  Client with Metadata                            │
    │                                                                  │
    │  MDProvided = true (unlocks action() method if metadata needed) │
    └─────────────────────────────────────────────────────────────────┘
         │
         │  .inputSchema(z.object({ ... }))
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                  Client with Input Schema                        │
    │                                                                  │
    │  Can be called multiple times to extend schema:                 │
    │  .inputSchema(z.object({ a: z.string() }))                      │
    │  .inputSchema(async (prev) => prev.extend({ b: z.number() }))   │
    └─────────────────────────────────────────────────────────────────┘
         │
         │  .bindArgsSchemas([z.string(), z.number()])
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │               Client with Bind Args Schemas                      │
    │                                                                  │
    │  Defines schemas for .bind() arguments                          │
    │  const boundAction = action.bind(null, "arg1", 42)              │
    └─────────────────────────────────────────────────────────────────┘
         │
         │  .outputSchema(z.object({ ... }))
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │               Client with Output Schema                          │
    │                                                                  │
    │  Validates server code return value                             │
    └─────────────────────────────────────────────────────────────────┘
         │
         │  .action(serverCodeFn) or .stateAction(serverCodeFn)
         ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                    Final Action Function                         │
    │                                                                  │
    │  CoolActionFn or CoolStateActionFn                              │
    │  Ready to be called from client or passed to hooks              │
    └─────────────────────────────────────────────────────────────────┘
```

---

## Diagram 4: actionBuilder() Internal Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           actionBuilder(args)                                    │
│                                                                                  │
│   Takes CoolActionClientArgs and returns { action, stateAction } methods        │
└─────────────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │         buildAction({ withState })      │
         │                                         │
         │  Internal factory function that creates │
         │  either action or stateAction          │
         └────────────────────┬───────────────────┘
                              │
           ┌──────────────────┴──────────────────┐
           │                                      │
           ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│  withState: false   │              │  withState: true    │
│                     │              │                     │
│  Returns:           │              │  Returns:           │
│  CoolActionFn       │              │  CoolStateActionFn  │
│                     │              │                     │
│  No prevResult      │              │  Has prevResult     │
│  argument           │              │  as 2nd argument    │
└─────────────────────┘              └─────────────────────┘
           │                                      │
           └──────────────────┬───────────────────┘
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │     Returned async function            │
         │                                         │
         │   async (...clientInputs) => {          │
         │     // 1. Initialize state              │
         │     // 2. Handle prevResult (if stateful)│
         │     // 3. Execute middleware stack      │
         │     // 4. Build and return result       │
         │   }                                     │
         └────────────────────────────────────────┘
```

### Key Variables Inside the Action Function

```typescript
// action-builder.ts - Inside the returned async function

let currentCtx: object = {};                          // Accumulated context
const middlewareResult: MiddlewareResult = { success: false };  // Execution result
let prevResult: CoolActionResult = {};                // Previous result (stateful only)
const parsedInputDatas: any[] = [];                   // Validated inputs
const frameworkErrorHandler = new FrameworkErrorHandler();  // Next.js error handler
let serverErrorHandled = false;                       // Track if error was handled
```

---

## Diagram 5: Middleware Stack Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    executeMiddlewareStack() Flow                                 │
│                                                                                  │
│   Recursive function that executes middleware chain with next() pattern         │
└─────────────────────────────────────────────────────────────────────────────────┘

executeMiddlewareStack(idx = 0)
         │
         ▼
    ┌────────────────────────────────────────────────────────────────┐
    │  Check for framework error (redirect/notFound)                  │
    │  if (frameworkErrorHandler.error) return;                       │
    └────────────────────────────────┬───────────────────────────────┘
                                     │
         ┌───────────────────────────┴───────────────────────────┐
         │                                                        │
         │ idx === 0 (First iteration only)                       │
         ▼                                                        │
    ┌────────────────────────────┐                               │
    │  Validate Metadata         │                               │
    │  if (args.metadataSchema)  │                               │
    │    standardParse(schema,   │                               │
    │                 metadata)  │                               │
    └────────────────────────────┘                               │
                                                                 │
         ┌───────────────────────────────────────────────────────┘
         │
         ▼
    ┌────────────────────────────────────────────────────────────┐
    │  Get middleware at current index                            │
    │  const middlewareFn = args.middlewareFns[idx]               │
    └────────────────────────────────┬───────────────────────────┘
                                     │
              ┌──────────────────────┴──────────────────────┐
              │                                             │
              ▼                                             ▼
    ┌─────────────────────┐                     ┌─────────────────────┐
    │  middlewareFn       │                     │  No more middleware  │
    │  exists             │                     │  (idx >= length)     │
    │                     │                     │                      │
    │  Execute middleware │                     │  Execute ACTION      │
    │  with next()        │                     │  (validation +       │
    └──────────┬──────────┘                     │   server code)       │
               │                                └──────────────────────┘
               ▼
    ┌─────────────────────────────────────────────────────────────┐
    │                                                              │
    │   await middlewareFn({                                       │
    │     clientInput: clientInputs.at(-1),                        │
    │     bindArgsClientInputs: clientInputs.slice(0, -1),         │
    │     ctx: currentCtx,                                         │
    │     metadata: args.metadata,                                 │
    │     next: async (nextOpts) => {                              │
    │       currentCtx = deepmerge(currentCtx, nextOpts?.ctx ?? {});│
    │       await executeMiddlewareStack(idx + 1);  ← RECURSION    │
    │       return middlewareResult;                               │
    │     }                                                        │
    │   })                                                         │
    │                                                              │
    └─────────────────────────────────────────────────────────────┘
```

---

## Diagram 6: executeMiddlewareStack() Step-by-Step

```
Example: Client with 2 middleware functions + action

    middlewareFns = [
      initialMiddleware,      // idx 0: async ({ next }) => next({ ctx: {} })
      authMiddleware,         // idx 1: adds userId to ctx
      loggingMiddleware       // idx 2: logs request
    ]

    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                           │
    │  STEP 1: executeMiddlewareStack(0)                                        │
    │                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  initialMiddleware executes                                          │ │
    │  │  ctx = {}                                                            │ │
    │  │                                                                      │ │
    │  │  Calls: next({ ctx: {} })                                            │ │
    │  │         └──────────────┐                                             │ │
    │  └────────────────────────┼─────────────────────────────────────────────┘ │
    │                           │                                               │
    │                           ▼                                               │
    │  STEP 2: executeMiddlewareStack(1)                                        │
    │                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  authMiddleware executes                                             │ │
    │  │  ctx = {} (from previous)                                            │ │
    │  │                                                                      │ │
    │  │  const userId = await getUser();                                     │ │
    │  │  Calls: next({ ctx: { userId } })                                    │ │
    │  │         └──────────────────────┐                                     │ │
    │  └────────────────────────────────┼─────────────────────────────────────┘ │
    │                                   │                                       │
    │                                   ▼                                       │
    │  STEP 3: executeMiddlewareStack(2)                                        │
    │                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  loggingMiddleware executes                                          │ │
    │  │  ctx = { userId } (accumulated via deepmerge)                        │ │
    │  │                                                                      │ │
    │  │  console.log("Request started");                                     │ │
    │  │  const result = await next();  ← No ctx extension                    │ │
    │  │  console.log("Request ended", result);                               │ │
    │  │                    └────────────────┐                                │ │
    │  └─────────────────────────────────────┼────────────────────────────────┘ │
    │                                        │                                  │
    │                                        ▼                                  │
    │  STEP 4: executeMiddlewareStack(3) - NO MORE MIDDLEWARE                   │
    │                                                                           │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  ACTION EXECUTION                                                    │ │
    │  │  ctx = { userId } (final accumulated context)                        │ │
    │  │                                                                      │ │
    │  │  1. Validate inputs (inputSchema, bindArgsSchemas)                   │ │
    │  │  2. Execute serverCodeFn({ parsedInput, ctx, metadata })             │ │
    │  │  3. Validate output (if outputSchema exists)                         │ │
    │  │  4. Set middlewareResult.success = true                              │ │
    │  │  5. Set middlewareResult.data = returnedData                         │ │
    │  └─────────────────────────────────────────────────────────────────────┘ │
    │                                        │                                  │
    │                                        │  Returns up the stack            │
    │                                        ▼                                  │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  loggingMiddleware receives middlewareResult                         │ │
    │  │  console.log("Request ended", result); ← Can log/modify result       │ │
    │  │  return result;                                                      │ │
    │  └─────────────────────────────────────────────────────────────────────┘ │
    │                                        │                                  │
    │                                        ▼                                  │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  authMiddleware receives middlewareResult                            │ │
    │  │  return result;                                                      │ │
    │  └─────────────────────────────────────────────────────────────────────┘ │
    │                                        │                                  │
    │                                        ▼                                  │
    │  ┌─────────────────────────────────────────────────────────────────────┐ │
    │  │  initialMiddleware receives middlewareResult                         │ │
    │  │  return result;                                                      │ │
    │  └─────────────────────────────────────────────────────────────────────┘ │
    │                                                                           │
    └──────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 7: Server Code Function Invocation

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Server Code Function Arguments                               │
└─────────────────────────────────────────────────────────────────────────────────┘

    FOR .action() - ServerCodeFn:
    ──────────────────────────────

    serverCodeFn({
      parsedInput,           // Validated main input from inputSchema
      clientInput,           // Raw input before validation
      bindArgsParsedInputs,  // Array of validated bind args
      bindArgsClientInputs,  // Array of raw bind args
      ctx,                   // Accumulated context from middleware
      metadata               // Action metadata
    })

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   Example:                                                               │
    │                                                                          │
    │   const deleteUser = action                                              │
    │     .metadata({ actionName: "deleteUser" })                              │
    │     .inputSchema(z.object({ userId: z.string().uuid() }))                │
    │     .bindArgsSchemas([z.string()])  // orgId                             │
    │     .action(async ({                                                     │
    │       parsedInput,         // { userId: "uuid-here" }                    │
    │       clientInput,         // { userId: "uuid-here" } (same if valid)    │
    │       bindArgsParsedInputs, // ["org-123"]                               │
    │       bindArgsClientInputs, // ["org-123"]                               │
    │       ctx,                 // { userId: "auth-user-id", sessionId: "..." }│
    │       metadata             // { actionName: "deleteUser" }               │
    │     }) => {                                                              │
    │       // Server logic here                                               │
    │       return { success: true };                                          │
    │     });                                                                  │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘


    FOR .stateAction() - StateServerCodeFn:
    ───────────────────────────────────────

    serverCodeFn(
      {
        parsedInput,
        clientInput,
        bindArgsParsedInputs,
        bindArgsClientInputs,
        ctx,
        metadata
      },
      {
        prevResult    // Previous action result (for useStateAction / useActionState)
      }
    )

    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   Example:                                                               │
    │                                                                          │
    │   const incrementCounter = action                                        │
    │     .metadata({ actionName: "increment" })                               │
    │     .inputSchema(z.object({ amount: z.number() }))                       │
    │     .stateAction(async (                                                 │
    │       { parsedInput, ctx, metadata },                                    │
    │       { prevResult }  // { data?: { count: number }, serverError?, ... } │
    │     ) => {                                                               │
    │       const previousCount = prevResult?.data?.count ?? 0;                │
    │       return { count: previousCount + parsedInput.amount };              │
    │     });                                                                  │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 8: Callback Execution Order

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      Server-Side Callback Execution                              │
│                                                                                  │
│   Callbacks defined in .action(serverCodeFn, { callbacks }) or .stateAction()   │
└─────────────────────────────────────────────────────────────────────────────────┘

    Action Execution Complete
              │
              ▼
    ┌─────────────────────────────────────────────┐
    │  Check for Framework Error                   │
    │  (redirect, notFound, forbidden, etc.)       │
    └─────────────────────┬───────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────┐                 ┌─────────────┐
    │  Framework  │                 │ No Framework│
    │  Error      │                 │ Error       │
    └──────┬──────┘                 └──────┬──────┘
           │                               │
           ▼                               │
    ┌─────────────────────┐                │
    │  onNavigation()     │                │
    │  Called with:       │                │
    │  - navigationKind   │                │
    │  - metadata, ctx    │                │
    │  - clientInput      │                │
    └──────────┬──────────┘                │
               │                           │
               ▼                           │
    ┌─────────────────────┐                │
    │  onSettled()        │                │
    │  Called with:       │                │
    │  - result: {}       │                │
    │  - navigationKind   │                │
    └──────────┬──────────┘                │
               │                           │
               ▼                           │
    ┌─────────────────────┐                │
    │  THROW Framework    │                │
    │  Error (Next.js     │                │
    │  handles it)        │                │
    └─────────────────────┘                │
                                           │
         ┌─────────────────────────────────┘
         │
         ▼
    ┌─────────────────────────────────────────────┐
    │  Check Action Result                         │
    └─────────────────────┬───────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
    ┌─────────────┐                 ┌─────────────┐
    │  SUCCESS    │                 │  ERROR      │
    │  (no errors)│                 │  (has error)│
    └──────┬──────┘                 └──────┬──────┘
           │                               │
           ▼                               ▼
    ┌─────────────────────┐        ┌─────────────────────┐
    │  onSuccess()        │        │  onError()          │
    │  Called with:       │        │  Called with:       │
    │  - data             │        │  - error (result    │
    │  - metadata, ctx    │        │    without data)    │
    │  - clientInput      │        │  - metadata, ctx    │
    │  - parsedInput      │        │  - clientInput      │
    └──────────┬──────────┘        └──────────┬──────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  onSettled()        │
                   │  ALWAYS called      │
                   │                     │
                   │  Called with:       │
                   │  - result           │
                   │  - metadata, ctx    │
                   │  - clientInput      │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │  Return actionResult│
                   │  to client          │
                   └─────────────────────┘


    EXECUTION ORDER SUMMARY:
    ────────────────────────

    Success Case:      onSuccess() → onSettled() → return result
    Error Case:        onError() → onSettled() → return result
    Navigation Case:   onNavigation() → onSettled() → throw error

    Note: Callbacks are executed in parallel where possible using Promise.all()
```

---

## createMiddleware() - Standalone Middleware Factory

The `createMiddleware()` function allows you to create reusable, type-safe middleware functions that can be shared across multiple action clients.

```typescript
// middleware.ts
export const createMiddleware = <BaseData extends { 
  serverError?: any; 
  ctx?: object; 
  metadata?: any 
}>() => {
  return {
    define: <NextCtx extends object>(
      middlewareFn: MiddlewareFn<
        BaseData extends { serverError: infer SE } ? SE : any,
        BaseData extends { metadata: infer MD } ? MD : any,
        BaseData extends { ctx: infer Ctx extends object } ? Ctx : object,
        NextCtx
      >
    ) => middlewareFn,
  };
};
```

### Usage Example

```typescript
// Create a typed middleware
const authMiddleware = createMiddleware<{
  ctx: { requestId: string };  // Requires this context to exist
  metadata: { actionName: string };  // Requires this metadata shape
}>().define(async ({ ctx, metadata, next }) => {
  const userId = await authenticate();
  
  console.log(`Action ${metadata.actionName} called by ${userId}`);
  
  return next({
    ctx: { userId }  // Extends context with userId
  });
});

// Use in client
const action = createCoolActionClient()
  .use(async ({ next }) => next({ ctx: { requestId: crypto.randomUUID() } }))
  .use(authMiddleware);  // Now authMiddleware has access to requestId
```

---

## Framework Error Handling

The `FrameworkErrorHandler` class handles Next.js-specific errors that should be rethrown after action execution.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         Framework Error Types                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

    ┌───────────────────┐
    │  Next.js throws   │
    │  special errors   │
    └─────────┬─────────┘
              │
              ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   isNavigationError(error) checks for:                                   │
    │                                                                          │
    │   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐       │
    │   │ isNextRouter    │   │ isBailoutToCSR  │   │ isDynamicUsage  │       │
    │   │ Error           │   │ Error           │   │ Error           │       │
    │   └─────────────────┘   └─────────────────┘   └─────────────────┘       │
    │                                                                          │
    │   ┌─────────────────┐                                                   │
    │   │ isPostpone      │                                                   │
    │   │                 │                                                   │
    │   └─────────────────┘                                                   │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘
              │
              ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                                                                          │
    │   getNavigationKind(error) returns:                                      │
    │                                                                          │
    │   ┌─────────────────────────────────────────────────────────────────┐   │
    │   │  "redirect"     ← redirect() was called                          │   │
    │   │  "notFound"     ← notFound() was called (HTTP 404)               │   │
    │   │  "forbidden"    ← forbidden() was called (HTTP 403)              │   │
    │   │  "unauthorized" ← unauthorized() was called (HTTP 401)           │   │
    │   │  "other"        ← Other navigation error                         │   │
    │   └─────────────────────────────────────────────────────────────────┘   │
    │                                                                          │
    └─────────────────────────────────────────────────────────────────────────┘
```

### Code Example

```typescript
// Inside action-builder.ts
const frameworkErrorHandler = new FrameworkErrorHandler();

try {
  // Execute middleware and server code
  const data = await serverCodeFn(...).catch((e) => 
    frameworkErrorHandler.handleError(e)  // Captures navigation errors
  );
} catch (e) {
  // Handle other errors
}

// After execution
if (frameworkErrorHandler.error) {
  // Execute navigation callbacks
  await utils?.onNavigation?.({ navigationKind: ... });
  await utils?.onSettled?.({ ... });
  
  // Rethrow so Next.js can handle it
  throw frameworkErrorHandler.error;
}
```

---

## Design Decisions

### Why Return New Instances Instead of Mutating?

Each builder method (`use()`, `inputSchema()`, etc.) returns a **new** `CoolActionClient` instance rather than mutating the existing one. This design choice enables:

1. **Type Accumulation**: TypeScript can track how types change through the chain
2. **Immutability**: Previous client instances remain unchanged
3. **Reusability**: You can branch from any point in the chain

```typescript
// Both authAction and adminAction share the base middleware
const baseAction = createCoolActionClient()
  .use(loggingMiddleware);

const authAction = baseAction
  .use(authMiddleware);  // baseAction unchanged

const adminAction = baseAction
  .use(adminMiddleware); // baseAction still unchanged
```

### Why Use Recursive Middleware Execution?

The recursive `next()` pattern (similar to Koa/Express) provides:

1. **Pre/Post Processing**: Middleware can execute code before AND after the action
2. **Error Boundaries**: Each middleware can catch errors from deeper in the stack
3. **Result Transformation**: Middleware can modify the result on the way back up

### Why Separate `action()` and `stateAction()`?

These two methods serve different use cases:
- `action()`: Standard actions called directly or via `useAction`/`useOptimisticAction`
- `stateAction()`: Actions that receive previous state, designed for React's `useActionState` pattern

The separation allows for:
1. Different type signatures (stateAction has `prevResult`)
2. Clear intent in code
3. Proper TypeScript inference for each use case
