<div align="center">
  <h1>next-cool-action</h1>
</div>

> **Note:** This is a fork of [next-safe-action](https://github.com/TheEdoRan/next-safe-action) by Edoardo Ranghieri.

**next-cool-action** is a library that takes full advantage of the latest and greatest Next.js, React and TypeScript features to let you define **type safe** Server Actions and execute them inside React Components.

## Features

- Pretty simple
- End-to-end type safety
- Form Actions support
- Powerful middleware system
- Input/output validation using multiple validation libraries
- Advanced server error handling
- Optimistic updates

## Why next-cool-action?

**next-cool-action** is an internal rewrite of [next-safe-action](https://github.com/TheEdoRan/next-safe-action).

There are some open issues in next-safe-action related to `revalidateTag`, `cacheComponents`, and actions getting stuck in loading state ([#393](https://github.com/TheEdoRan/next-safe-action/issues/393), [#376](https://github.com/TheEdoRan/next-safe-action/issues/376)). The repo author seems to be busy, and since I couldn't wait, I rewrote the internals in a cleaner fashion.

The main change: instead of using `useLayoutEffect` to react to state changes and fire callbacks, next-cool-action calls callbacks directly after the server action completes. This seems to have fixed quite a few of these timing issues. I also fixed a few internal type issues and removed some unnecessary type assertions.

## Documentation

Check out the [documentation](https://next-cool-action-docs.vercel.app) to learn more about the library.

## Installation

```bash
npm i next-cool-action
```

## Contributing

If you want to contribute to next-cool-action, please check out the [contributing guide](./CONTRIBUTING.md).

## License

next-cool-action is released under the [MIT License](./LICENSE).
