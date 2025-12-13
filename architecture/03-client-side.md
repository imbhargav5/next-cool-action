# Client-Side Hooks Architecture

This document provides a deep dive into the React hooks provided by next-cool-action for client-side action execution, including state management, callbacks, and status handling.

---

## Table of Contents

1. [useAction Hook](#useaction-hook)
2. [useOptimisticAction Hook](#useoptimisticaction-hook)
3. [useStateAction Hook](#usestateaction-hook)
4. [Hook Return Object](#hook-return-object)
5. [Status Lifecycle](#status-lifecycle)
6. [Callback Execution](#callback-execution)
7. [React Transitions](#react-transitions)

---

## Diagram 1: useAction Hook State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          useAction STATE MACHINE                                 │
│                                                                                  │
│   The hook manages multiple pieces of state that together determine the          │
│   current status of the action execution.                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         INTERNAL STATE
                         ──────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   const [isTransitioning, startTransition] = useTransition();                    │
│   const [result, setResult] = useState<SafeActionResult>({});                    │
│   const [clientInput, setClientInput] = useState<Input>();                       │
│   const [isExecuting, setIsExecuting] = useState(false);                         │
│   const [navigationError, setNavigationError] = useState<Error | null>(null);    │
│   const [thrownError, setThrownError] = useState<Error | null>(null);            │
│   const [isIdle, setIsIdle] = useState(true);                                    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         STATE MACHINE DIAGRAM
                         ─────────────────────

                              ┌─────────────┐
                              │             │
                              │    IDLE     │◀─────────────────────────────┐
                              │  isIdle=T   │                              │
                              │             │                              │
                              └──────┬──────┘                              │
                                     │                                     │
                                     │ execute(input) called               │
                                     │                                     │
                                     ▼                                     │
                              ┌─────────────┐                              │
                              │             │                              │
                              │ EXECUTING   │                              │
                              │isExecuting=T│                              │
                              │  isIdle=F   │                              │
                              │             │                              │
                              └──────┬──────┘                              │
                                     │                                     │
                                     │ startTransition begins              │
                                     │                                     │
                                     ▼                                     │
                              ┌─────────────┐                              │
                              │             │                              │
                              │TRANSITIONING│                              │
                              │isTrans...=T │                              │
                              │isExecuting=F│                              │
                              │             │                              │
                              └──────┬──────┘                              │
                                     │                                     │
           ┌─────────────────────────┼─────────────────────────┐           │
           │                         │                         │           │
           ▼                         ▼                         ▼           │
    ┌─────────────┐          ┌─────────────┐          ┌─────────────┐     │
    │             │          │             │          │             │     │
    │HAS_SUCCEEDED│          │ HAS_ERRORED │          │HAS_NAVIGATED│     │
    │  result.data│          │result.server│          │navigationErr│     │
    │    exists   │          │Error exists │          │  is set     │     │
    │             │          │             │          │             │     │
    └──────┬──────┘          └──────┬──────┘          └──────┬──────┘     │
           │                        │                        │            │
           │                        │                        │            │
           └────────────────────────┼────────────────────────┘            │
                                    │                                     │
                                    │ reset() called                      │
                                    │                                     │
                                    └─────────────────────────────────────┘

                         STATE TRANSITIONS TABLE
                         ──────────────────────

┌────────────────┬─────────────────────┬────────────────────────────────────────┐
│  Current State │     Trigger         │           Next State                   │
├────────────────┼─────────────────────┼────────────────────────────────────────┤
│  idle          │  execute(input)     │  executing                             │
│  executing     │  transition starts  │  transitioning                         │
│  transitioning │  success (data)     │  hasSucceeded                          │
│  transitioning │  error (server/val) │  hasErrored                            │
│  transitioning │  navigation error   │  hasNavigated                          │
│  hasSucceeded  │  execute(input)     │  executing                             │
│  hasErrored    │  execute(input)     │  executing                             │
│  hasNavigated  │  execute(input)     │  executing                             │
│  any           │  reset()            │  idle                                  │
└────────────────┴─────────────────────┴────────────────────────────────────────┘
```

---

## Diagram 2: useOptimisticAction Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       useOptimisticAction FLOW                                   │
│                                                                                  │
│   Extends useAction with React's useOptimistic for immediate UI updates          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         OPTIMISTIC UPDATE FLOW
                         ──────────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   useOptimisticAction(action, {                                                  │
│     currentState: todos,           // Current server state                       │
│     updateFn: (state, input) => {  // How to optimistically update               │
│       return [...state, { id: "temp", text: input.text }];                       │
│     }                                                                            │
│   })                                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

    TIME ─────────────────────────────────────────────────────────────────────────▶

    ┌────────────────┐
    │ Initial State  │
    │ todos = [A, B] │
    │                │
    │ optimisticState│
    │   = [A, B]     │
    └───────┬────────┘
            │
            │ User clicks "Add C"
            │ execute({ text: "C" })
            ▼
    ┌────────────────────────────────────────────────────────────────────────────┐
    │                                                                             │
    │   INSIDE startTransition:                                                   │
    │                                                                             │
    │   1. setOptimisticValue(input)   ◀── React's useOptimistic                  │
    │      │                                                                      │
    │      │  updateFn(currentState, input)                                       │
    │      │  = [...[A, B], { id: "temp", text: "C" }]                            │
    │      │  = [A, B, C_temp]                                                    │
    │      │                                                                      │
    │      └──▶ optimisticState = [A, B, C_temp]   ◀── IMMEDIATE UI UPDATE       │
    │                                                                             │
    │   2. safeActionFn(input)         ◀── Server call starts                     │
    │                                                                             │
    └────────────────────────────────────────────────────────────────────────────┘
            │
            │ UI shows [A, B, C_temp] immediately
            │ (C_temp might have loading indicator)
            │
            ▼
    ┌────────────────┐                              ┌────────────────┐
    │    SUCCESS     │                              │    FAILURE     │
    │                │                              │                │
    │ Server returns │                              │ Server returns │
    │ { data: C_real}│                              │ { serverError }│
    │                │                              │                │
    │ Page revalidates                              │ Transition ends │
    │ currentState   │                              │                │
    │   = [A, B, C]  │                              │ optimisticState│
    │                │                              │   REVERTS to   │
    │ optimisticState│                              │   [A, B]       │
    │   = [A, B, C]  │                              │                │
    └────────────────┘                              └────────────────┘

                         INTERNAL IMPLEMENTATION
                         ──────────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   const [optimisticState, setOptimisticValue] = React.useOptimistic<            │
│     State,                          // Type of state                             │
│     InferInputOrDefault<S, undefined> // Type of input                           │
│   >(                                                                             │
│     utils.currentState,             // Initial/server state                      │
│     utils.updateFn                  // (state, input) => newState                │
│   );                                                                             │
│                                                                                  │
│   const execute = useCallback((input) => {                                       │
│     // ... setup state ...                                                       │
│                                                                                  │
│     startTransition(() => {                                                      │
│       setOptimisticValue(input);    // ◀── Optimistic update FIRST              │
│       safeActionFn(input)           // ◀── Then server call                      │
│         .then(...)                                                               │
│         .catch(...)                                                              │
│         .finally(...);                                                           │
│     });                                                                          │
│   }, [...]);                                                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         KEY POINTS
                         ──────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   1. setOptimisticValue MUST be called inside startTransition                    │
│      └─▶ React automatically reverts on transition end                           │
│                                                                                  │
│   2. optimisticState shows "pending" state during transition                     │
│      └─▶ Use for immediate UI feedback                                           │
│                                                                                  │
│   3. currentState should be revalidated on success                               │
│      └─▶ Use revalidatePath() or revalidateTag() in action                       │
│                                                                                  │
│   4. On error, optimisticState automatically reverts to currentState             │
│      └─▶ No manual rollback needed                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 3: Hook Return Object Structure

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       HOOK RETURN OBJECT STRUCTURE                               │
│                                                                                  │
│   All hooks return a consistent object structure with methods and state          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         useAction RETURN
                         ────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   UseActionHookReturn<ServerError, S, CVE, Data>                                 │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   METHODS                                                                │   │
│   │   ───────                                                                │   │
│   │                                                                          │   │
│   │   execute: (input) => void                                               │   │
│   │   └─▶ Fire-and-forget execution                                          │   │
│   │   └─▶ Updates state, triggers callbacks                                  │   │
│   │                                                                          │   │
│   │   executeAsync: (input) => Promise<SafeActionResult>                     │   │
│   │   └─▶ Awaitable execution                                                │   │
│   │   └─▶ Returns result directly                                            │   │
│   │   └─▶ Also updates state and triggers callbacks                          │   │
│   │                                                                          │   │
│   │   reset: () => void                                                      │   │
│   │   └─▶ Resets all state to initial values                                 │   │
│   │   └─▶ Sets isIdle = true                                                 │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   STATE                                                                  │   │
│   │   ─────                                                                  │   │
│   │                                                                          │   │
│   │   input: InferInputOrDefault<S, undefined>                               │   │
│   │   └─▶ Last input passed to execute                                       │   │
│   │                                                                          │   │
│   │   result: SafeActionResult<ServerError, S, CVE, Data>                    │   │
│   │   └─▶ { data?, serverError?, validationErrors? }                         │   │
│   │                                                                          │   │
│   │   status: HookActionStatus                                               │   │
│   │   └─▶ "idle" | "executing" | "transitioning" |                           │   │
│   │       "hasSucceeded" | "hasErrored" | "hasNavigated"                     │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │                                                                          │   │
│   │   SHORTHAND STATUS (booleans)                                            │   │
│   │   ───────────────────────────                                            │   │
│   │                                                                          │   │
│   │   isIdle: boolean          └─▶ status === "idle"                         │   │
│   │   isExecuting: boolean     └─▶ status === "executing"                    │   │
│   │   isTransitioning: boolean └─▶ status === "transitioning"                │   │
│   │   isPending: boolean       └─▶ isExecuting || isTransitioning            │   │
│   │   hasSucceeded: boolean    └─▶ status === "hasSucceeded"                 │   │
│   │   hasErrored: boolean      └─▶ status === "hasErrored"                   │   │
│   │   hasNavigated: boolean    └─▶ status === "hasNavigated"                 │   │
│   │                                                                          │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         COMPARISON TABLE
                         ────────────────

┌────────────────────────┬───────────┬────────────────────┬──────────────────────┐
│       Property         │ useAction │ useOptimisticAction│   useStateAction     │
├────────────────────────┼───────────┼────────────────────┼──────────────────────┤
│  execute               │    ✓      │         ✓          │         ✓            │
│  executeAsync          │    ✓      │         ✓          │         ✗            │
│  reset                 │    ✓      │         ✓          │         ✗            │
│  input                 │    ✓      │         ✓          │         ✓            │
│  result                │    ✓      │         ✓          │         ✓            │
│  status                │    ✓      │         ✓          │         ✓            │
│  isIdle                │    ✓      │         ✓          │         ✓            │
│  isExecuting           │    ✓      │         ✓          │         ✓            │
│  isTransitioning       │    ✓      │         ✓          │         ✓            │
│  isPending             │    ✓      │         ✓          │         ✓            │
│  hasSucceeded          │    ✓      │         ✓          │         ✓            │
│  hasErrored            │    ✓      │         ✓          │         ✓            │
│  hasNavigated          │    ✓      │         ✓          │         ✓            │
│  optimisticState       │    ✗      │         ✓          │         ✗            │
└────────────────────────┴───────────┴────────────────────┴──────────────────────┘
```

---

## Diagram 4: Status Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          STATUS LIFECYCLE                                        │
│                                                                                  │
│   How status is computed from internal state                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         getActionStatus() LOGIC
                         ───────────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   function getActionStatus({                                                     │
│     isIdle,                                                                      │
│     isExecuting,                                                                 │
│     isTransitioning,                                                             │
│     result,                                                                      │
│     hasNavigated,                                                                │
│     hasThrownError                                                               │
│   }): HookActionStatus {                                                         │
│                                                                                  │
│     ┌─────────────────────────────────────────────────────────────────────────┐ │
│     │                                                                          │ │
│     │   if (isIdle) {                                                          │ │
│     │     return "idle";                                                       │ │
│     │   }                                                                      │ │
│     │         │                                                                │ │
│     │         ▼                                                                │ │
│     │   else if (isExecuting) {                                                │ │
│     │     return "executing";                                                  │ │
│     │   }                                                                      │ │
│     │         │                                                                │ │
│     │         ▼                                                                │ │
│     │   else if (isTransitioning) {                                            │ │
│     │     return "transitioning";                                              │ │
│     │   }                                                                      │ │
│     │         │                                                                │ │
│     │         ▼                                                                │ │
│     │   else if (hasThrownError ||                                             │ │
│     │            result.validationErrors !== undefined ||                      │ │
│     │            result.serverError !== undefined) {                           │ │
│     │     return "hasErrored";                                                 │ │
│     │   }                                                                      │ │
│     │         │                                                                │ │
│     │         ▼                                                                │ │
│     │   else if (hasNavigated) {                                               │ │
│     │     return "hasNavigated";                                               │ │
│     │   }                                                                      │ │
│     │         │                                                                │ │
│     │         ▼                                                                │ │
│     │   else {                                                                 │ │
│     │     return "hasSucceeded";                                               │ │
│     │   }                                                                      │ │
│     │                                                                          │ │
│     └─────────────────────────────────────────────────────────────────────────┘ │
│   }                                                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         DECISION TREE
                         ─────────────

                              START
                                │
                                ▼
                        ┌───────────────┐
                        │   isIdle?     │
                        └───────┬───────┘
                           YES  │  NO
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
             ┌──────────┐           ┌───────────────┐
             │  "idle"  │           │ isExecuting?  │
             └──────────┘           └───────┬───────┘
                                       YES  │  NO
                                ┌───────────┴───────────┐
                                │                       │
                                ▼                       ▼
                         ┌────────────┐         ┌───────────────┐
                         │"executing" │         │isTransitioning│
                         └────────────┘         └───────┬───────┘
                                                   YES  │  NO
                                            ┌───────────┴───────────┐
                                            │                       │
                                            ▼                       ▼
                                     ┌──────────────┐       ┌───────────────┐
                                     │"transitioning│       │  hasError?    │
                                     └──────────────┘       │ (thrown/val/  │
                                                            │  server)      │
                                                            └───────┬───────┘
                                                               YES  │  NO
                                                        ┌───────────┴───────────┐
                                                        │                       │
                                                        ▼                       ▼
                                                 ┌────────────┐         ┌───────────────┐
                                                 │"hasErrored"│         │ hasNavigated? │
                                                 └────────────┘         └───────┬───────┘
                                                                           YES  │  NO
                                                                    ┌───────────┴───────────┐
                                                                    │                       │
                                                                    ▼                       ▼
                                                             ┌─────────────┐        ┌─────────────┐
                                                             │"hasNavigated│        │"hasSucceeded│
                                                             └─────────────┘        └─────────────┘

                         TIMELINE EXAMPLE
                         ────────────────

    Time ─────────────────────────────────────────────────────────────────────────▶

    ┌──────┐   ┌──────────┐   ┌─────────────┐   ┌────────────────────────────────┐
    │ idle │──▶│ executing│──▶│transitioning│──▶│ hasSucceeded/hasErrored/       │
    │      │   │          │   │             │   │ hasNavigated                   │
    └──────┘   └──────────┘   └─────────────┘   └────────────────────────────────┘
        │           │               │                         │
        │      setTimeout(0)    React                    setResult()
        │      sets state     transition               setIsExecuting(false)
    execute()      │           updates                        │
     called        ▼               │                          ▼
                 State:           Stable                   Callbacks
              isIdle=false     concurrent                  triggered
              isExecuting=true   state
```

---

## Diagram 5: Callback Execution Timeline

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       CALLBACK EXECUTION TIMELINE                                │
│                                                                                  │
│   Client-side callbacks are triggered via useActionCallbacks hook                │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         AVAILABLE CALLBACKS
                         ───────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   useAction(action, {                                                            │
│     onExecute:   ({ input }) => { ... },     // When execution starts            │
│     onSuccess:   ({ data, input }) => { ... }, // On successful result           │
│     onError:     ({ error, input }) => { ... }, // On error result               │
│     onNavigation:({ input, navigationKind }) => { ... }, // On navigation        │
│     onSettled:   ({ result, input }) => { ... }  // After any completion         │
│   })                                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         EXECUTION TIMELINE
                         ──────────────────

    Time ─────────────────────────────────────────────────────────────────────────▶

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                                                                              │
    │   STATUS: "executing"                                                        │
    │                                                                              │
    │   ┌──────────────────────────────────────────────────────────────────────┐  │
    │   │  onExecute({ input })                                                 │  │
    │   │                                                                       │  │
    │   │  • Called immediately when status becomes "executing"                 │  │
    │   │  • Use for: showing loading indicators, disabling form, analytics     │  │
    │   └──────────────────────────────────────────────────────────────────────┘  │
    │                                                                              │
    └──────────────────────────────────────┬──────────────────────────────────────┘
                                           │
                                           │ Server processes action...
                                           │
                                           ▼
    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                                           │                                       
    │                    ┌─────────────────┼─────────────────┐                    │
                         │                 │                 │                     
    │                    ▼                 ▼                 ▼                    │

    │   STATUS: "hasSucceeded"    "hasErrored"       "hasNavigated"               │
                                                                                   
    │   ┌────────────────────┐   ┌────────────────────┐   ┌──────────────────┐   │
        │                    │   │                    │   │                  │    
    │   │ onSuccess({        │   │ onError({          │   │ onNavigation({   │   │
        │   data,            │   │   error: {         │   │   input,         │    
    │   │   input            │   │     serverError?,  │   │   navigationKind │   │
        │ })                 │   │     validationErr?,│   │ })               │    
    │   │                    │   │     thrownError?   │   │                  │   │
        │ • Success data     │   │   },               │   │ • Redirect       │    
    │   │ • Show toast       │   │   input            │   │ • notFound       │   │
        │ • Redirect         │   │ })                 │   │ • etc.           │    
    │   │                    │   │                    │   │                  │   │
        └─────────┬──────────┘   └─────────┬──────────┘   └────────┬─────────┘    
    │             │                        │                       │              │
                  │                        │                       │               
    │             └────────────────────────┼───────────────────────┘              │
                                           │                                       
    │                                      ▼                                      │
                                                                                   
    │   ┌──────────────────────────────────────────────────────────────────────┐  │
        │                                                                       │   
    │   │  onSettled({ result, input, navigationKind? })                        │  │
        │                                                                       │   
    │   │  • ALWAYS called after success, error, or navigation                  │  │
        │  • Called IN PARALLEL with onSuccess/onError/onNavigation             │   
    │   │  • Use for: cleanup, re-enabling form, hiding loading                 │  │
        │                                                                       │   
    │   └──────────────────────────────────────────────────────────────────────┘  │
                                                                                   
    └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘

                         useActionCallbacks IMPLEMENTATION
                         ────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   React.useLayoutEffect(() => {                                                  │
│     const executeCallbacks = async () => {                                       │
│       switch (status) {                                                          │
│         case "executing":                                                        │
│           await onExecute?.({ input });                                          │
│           break;                                                                 │
│                                                                                  │
│         case "hasSucceeded":                                                     │
│           await Promise.all([                                                    │
│             onSuccess?.({ data: result.data!, input }),                          │
│             onSettled?.({ result, input })                                       │
│           ]);                                                                    │
│           break;                                                                 │
│                                                                                  │
│         case "hasErrored":                                                       │
│           await Promise.all([                                                    │
│             onError?.({ error: { ...result, thrownError }, input }),             │
│             onSettled?.({ result, input })                                       │
│           ]);                                                                    │
│           break;                                                                 │
│                                                                                  │
│         case "hasNavigated":                                                     │
│           const kind = FrameworkErrorHandler.getNavigationKind(navigationError); │
│           await Promise.all([                                                    │
│             onNavigation?.({ input, navigationKind: kind }),                     │
│             onSettled?.({ result, input, navigationKind: kind })                 │
│           ]);                                                                    │
│           throw navigationError;  // Re-throw for React to handle                │
│           break;                                                                 │
│       }                                                                          │
│     };                                                                           │
│                                                                                  │
│     executeCallbacks().catch(console.error);                                     │
│   }, [status, result, input, ...callbacks]);                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 6: useCallbackRef Stability

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                       useCallbackRef STABILITY                                   │
│                                                                                  │
│   Custom hook to maintain stable callback references                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         THE PROBLEM
                         ───────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   WITHOUT useCallbackRef:                                                        │
│                                                                                  │
│   function Component() {                                                         │
│     const { execute } = useAction(action, {                                      │
│       onSuccess: (data) => {      ◀── New function on every render              │
│         console.log(data);                                                       │
│       }                                                                          │
│     });                                                                          │
│                                                                                  │
│     // Problem: onSuccess changes every render                                   │
│     // This causes useEffect dependencies to change                              │
│     // Leading to unnecessary effect re-runs                                     │
│   }                                                                              │
│                                                                                  │
│   Render 1:  onSuccess = () => {...}  (reference A)                              │
│   Render 2:  onSuccess = () => {...}  (reference B) ← DIFFERENT!                 │
│   Render 3:  onSuccess = () => {...}  (reference C) ← DIFFERENT!                 │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         THE SOLUTION
                         ────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   function useCallbackRef<T extends (arg: any) => any>(callback: T | undefined): T {│
│     const callbackRef = useRef(callback);                                        │
│                                                                                  │
│     // Update ref on every render (no dependency array)                          │
│     useEffect(() => {                                                            │
│       callbackRef.current = callback;                                            │
│     });                                                                          │
│                                                                                  │
│     // Return stable wrapper that calls current ref                              │
│     return useMemo(() => ((arg) => callbackRef.current?.(arg)) as T, []);        │
│   }                                                                              │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         VISUAL EXPLANATION
                         ──────────────────

    ┌────────────────────────────────────────────────────────────────────────────┐
    │                                                                             │
    │   Render 1                  Render 2                  Render 3              │
    │                                                                             │
    │   callback = fn_A           callback = fn_B           callback = fn_C       │
    │        │                         │                         │                │
    │        ▼                         ▼                         ▼                │
    │   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
    │   │ callbackRef │          │ callbackRef │          │ callbackRef │        │
    │   │  .current   │          │  .current   │          │  .current   │        │
    │   │   = fn_A    │          │   = fn_B    │          │   = fn_C    │        │
    │   └─────────────┘          └─────────────┘          └─────────────┘        │
    │        │                         │                         │                │
    │        │                         │                         │                │
    │        └─────────────────────────┼─────────────────────────┘                │
    │                                  │                                          │
    │                                  ▼                                          │
    │                         ┌───────────────────┐                               │
    │                         │ Stable Wrapper     │                               │
    │                         │                    │                               │
    │                         │ (arg) =>           │                               │
    │                         │   callbackRef      │                               │
    │                         │   .current?.(arg)  │                               │
    │                         │                    │◀── SAME REFERENCE             │
    │                         │ Created once in    │    across all renders         │
    │                         │ useMemo with []    │                               │
    │                         └───────────────────┘                               │
    │                                                                             │
    └────────────────────────────────────────────────────────────────────────────┘

                         USAGE IN useActionCallbacks
                         ──────────────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   export const useActionCallbacks = (...) => {                                   │
│     // Wrap all callbacks with useCallbackRef                                    │
│     const onExecute = useCallbackRef(cb?.onExecute);                             │
│     const onSuccess = useCallbackRef(cb?.onSuccess);                             │
│     const onError = useCallbackRef(cb?.onError);                                 │
│     const onSettled = useCallbackRef(cb?.onSettled);                             │
│     const onNavigation = useCallbackRef(cb?.onNavigation);                       │
│                                                                                  │
│     // These can now be safely used in dependency arrays                         │
│     useLayoutEffect(() => {                                                      │
│       // Effect won't re-run just because callbacks changed                      │
│       // Only re-runs when status/result/input change                            │
│     }, [status, result, input, onExecute, onSuccess, ...]);                      │
│   };                                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Diagram 7: React Transition Integration

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      REACT TRANSITION INTEGRATION                                │
│                                                                                  │
│   How the hooks integrate with React's useTransition for concurrent features     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         WHY USE TRANSITIONS?
                         ────────────────────

┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   React transitions provide several benefits:                                    │
│                                                                                  │
│   1. NON-BLOCKING UPDATES                                                        │
│      └─▶ UI remains responsive during server action                              │
│                                                                                  │
│   2. AUTOMATIC BATCHING                                                          │
│      └─▶ Multiple state updates batched together                                 │
│                                                                                  │
│   3. INTERRUPTIBLE                                                               │
│      └─▶ New actions can interrupt pending ones                                  │
│                                                                                  │
│   4. SUSPENSE INTEGRATION                                                        │
│      └─▶ Works with Suspense boundaries                                          │
│                                                                                  │
│   5. OPTIMISTIC UI SUPPORT                                                       │
│      └─▶ useOptimistic requires transition context                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

                         EXECUTION FLOW
                         ──────────────

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                                                                              │
    │   execute(input) is called                                                   │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                                                                              │
    │   setTimeout(() => {                                                         │
    │     setIsIdle(false);                                                        │
    │     setNavigationError(null);           ◀── Sync state updates               │
    │     setThrownError(null);                   (outside transition)             │
    │     setClientInput(input);                                                   │
    │     setIsExecuting(true);                                                    │
    │   }, 0);                                                                     │
    │                                                                              │
    │   WHY setTimeout(0)?                                                         │
    │   └─▶ Ensures state is set BEFORE transition starts                          │
    │   └─▶ Allows isExecuting to be true while isTransitioning is still false     │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │                                                                              │
    │   startTransition(() => {                                                    │
    │     // Everything inside here is a "transition"                              │
    │     // React knows this is low-priority and interruptible                    │
    │                                                                              │
    │     safeActionFn(input)                                                      │
    │       .then((res) => {                                                       │
    │         setResult(res ?? {});       ◀── These updates are batched            │
    │       })                                and deferred by React                │
    │       .catch((e) => {                                                        │
    │         setResult({});                                                       │
    │         if (isNavigationError(e)) {                                          │
    │           setNavigationError(e);                                             │
    │           return;                                                            │
    │         }                                                                    │
    │         setThrownError(e);                                                   │
    │         throw e;                    ◀── Re-throw for error boundary          │
    │       })                                                                     │
    │       .finally(() => {                                                       │
    │         setIsExecuting(false);      ◀── Mark execution complete              │
    │       });                                                                    │
    │   });                                                                        │
    │                                                                              │
    └─────────────────────────────────────────────────────────────────────────────┘

                         TIMING DIAGRAM
                         ──────────────

    Time ─────────────────────────────────────────────────────────────────────────▶

    execute() called
         │
         │  setTimeout(0) queued
         │       │
         ▼       │
    ┌────────┐   │
    │ Return │   │
    │  void  │   │
    └────────┘   │
                 │
                 ▼
    ┌──────────────────────┐
    │ setTimeout fires:     │
    │ isIdle = false        │
    │ isExecuting = true    │
    │ clientInput = input   │
    └──────────┬───────────┘
               │
               │  (same tick or next)
               ▼
    ┌──────────────────────────────────────────────────────────────────────────┐
    │                                                                           │
    │   startTransition begins                                                  │
    │   isTransitioning = true (from useTransition)                             │
    │                                                                           │
    │   ┌─────────────────────────────────────────────────────────────────┐    │
    │   │                                                                  │    │
    │   │   Server action executing...                                     │    │
    │   │   (async, may take seconds)                                      │    │
    │   │                                                                  │    │
    │   │   UI remains responsive                                          │    │
    │   │   Status: "executing" → "transitioning"                          │    │
    │   │                                                                  │    │
    │   └─────────────────────────────────────────────────────────────────┘    │
    │                                                                           │
    │   .then() / .catch() / .finally()                                         │
    │   setResult(), setIsExecuting(false)                                      │
    │                                                                           │
    └──────────────────────────────────────────────────────────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Transition complete   │
    │ isTransitioning=false │
    │ Final status computed │
    │ Callbacks triggered   │
    └──────────────────────┘
```

---

## useStateAction Hook (Deprecated)

The `useStateAction` hook wraps React's `useActionState` for stateful form actions. It's deprecated in favor of using `useActionState` directly.

```typescript
// Deprecated approach
const { execute, result, status } = useStateAction(stateAction, {
  initResult: {},
  permalink: "/form"
});

// Recommended approach
const [result, dispatch, isPending] = useActionState(stateAction, {});
```

### Why Deprecated?

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   1. React's useActionState is stable and well-documented                        │
│   2. Direct usage provides more control                                          │
│   3. Reduces library surface area                                                │
│   4. Better TypeScript support from React directly                               │
│                                                                                  │
│   The hook remains for backwards compatibility but may be removed in future.     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Why Separate isExecuting and isTransitioning?

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   isExecuting: Set synchronously when execute() is called                        │
│   └─▶ Immediate feedback that action was triggered                               │
│                                                                                  │
│   isTransitioning: Comes from React's useTransition                              │
│   └─▶ True while React is processing the async work                              │
│                                                                                  │
│   Combined as isPending = isExecuting || isTransitioning                         │
│   └─▶ Covers the entire "in progress" period                                     │
│                                                                                  │
│   Timeline:                                                                      │
│   execute() → isExecuting=true → transition starts → isExecuting=false           │
│                                  isTransitioning=true                            │
│                                                      → transition ends           │
│                                                        isTransitioning=false     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Why setTimeout(0) for Initial State?

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   setTimeout(() => {                                                             │
│     setIsIdle(false);                                                            │
│     setClientInput(input);                                                       │
│     setIsExecuting(true);                                                        │
│   }, 0);                                                                         │
│                                                                                  │
│   WHY?                                                                           │
│   1. State updates happen AFTER execute() returns                                │
│   2. But BEFORE the transition actually starts                                   │
│   3. This creates the brief "executing" phase                                    │
│   4. Without it, we'd jump straight to "transitioning"                           │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Why useLayoutEffect for Callbacks?

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│   useLayoutEffect runs synchronously after DOM updates                           │
│                                                                                  │
│   Benefits:                                                                      │
│   1. Callbacks run before browser paint                                          │
│   2. State changes in callbacks happen in same batch                             │
│   3. Prevents visual flickering                                                  │
│                                                                                  │
│   Example: If onSuccess sets some local state, it happens before                 │
│   the user sees the "success" state, preventing flash of old content.            │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

- **[04-data-flow.md](./04-data-flow.md)** - End-to-end data flow examples
- **[05-types-core.md](./05-types-core.md)** - TypeScript types explained
- **[06-types-advanced.md](./06-types-advanced.md)** - Advanced type patterns

