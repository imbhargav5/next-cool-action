# Contributing to next-cool-action

Thank you for your interest in contributing to next-cool-action! Please read the guidelines below before opening a pull request.

## Project Information

This is a monorepo that uses:

- [pnpm](https://pnpm.io/) as package manager
- [Turborepo](https://turbo.build/repo) as build system
- [TypeScript](https://www.typescriptlang.org/) as primary language
- [ESLint](https://eslint.org/) as linter
- [Prettier](https://prettier.io/) as formatter
- [Changesets](https://github.com/changesets/changesets) for version management and publishing
- [Fumadocs](https://fumadocs.vercel.app/) for the documentation site

### Prerequisites

- `git`
- Node.js version 22 (see [.nvmrc](./.nvmrc)). Recommended to use [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm) for managing Node.js versions
- [pnpm](https://pnpm.io/installation) (version 10.14.0 or compatible)
- [VS Code](https://code.visualstudio.com) is recommended, as the repository includes workspace-specific [settings](./.vscode/settings.json) and [extensions](./.vscode/extensions.json)

### Repository Structure

```
packages/
  next-cool-action/               # Main library - type-safe Next.js Server Actions
  adapter-react-hook-form/        # Integration adapter for react-hook-form

apps/
  playground/                     # Demo Next.js app showing library usage
  docs/                           # Documentation site (Fumadocs)
```

## How to Contribute

### Before Contributing

Before opening a pull request, please follow the general rule of **opening an issue or discussion first**, using the [issue templates](https://github.com/imbhargav5/next-cool-action/issues/new/choose). You can skip this step if:

- You're correcting a trivial error, like a typo
- An issue or discussion for the change already exists

### Development Setup

1. Fork and clone the repository, then install dependencies:

   ```sh
   pnpm install
   ```

2. Build the library packages and run the playground app:

   ```sh
   pnpm run build:lib && pnpm run pg
   ```

3. Run the documentation site locally:

   ```sh
   pnpm run docs
   ```

4. Run tests:

   ```sh
   pnpm run test:lib
   ```

5. Run linting:

   ```sh
   pnpm run lint:lib
   ```

> [!TIP]
> If you see type errors in the playground app after running `build:lib`, try restarting the TypeScript server in VS Code.

### Making Changes

When updating user-facing APIs, you are encouraged (but not required) to:

- Update the documentation in [`apps/docs/content/docs/`](./apps/docs/content/docs/)
- Write tests in [`packages/next-cool-action/src/__tests__/`](./packages/next-cool-action/src/__tests__/)

These can be done in later stages of the PR after your code changes are approved.

### Creating a Changeset

For changes that affect published packages (`next-cool-action` or `@next-cool-action/adapter-react-hook-form`), create a changeset:

```sh
pnpm changeset
```

Follow the prompts to select the affected packages and describe your changes. Changesets automate versioning and changelog generation when your PR is merged.

### Committing Changes

Use [Conventional Commits](https://www.conventionalcommits.org/) format for commit messages:

- `feat:` - new features
- `fix:` - bug fixes
- `docs:` - documentation changes
- `chore:` - maintenance tasks (playground, docs site, CI)
- `refactor:` - code refactoring
- `test:` - adding or updating tests

Examples:
```
feat: add retry option to action client
fix: resolve validation error formatting issue
docs: update middleware documentation
chore(playground): add new example for file uploads
```

### Pull Requests

1. Push your branch to your fork
2. Open a pull request against `main`
3. CI will automatically run linting and tests
4. Wait for review from maintainers

### CI/CD

- **Pull requests**: Runs `lint:lib` and `test:lib` on changes to packages
- **Merges to main**: Runs tests, then Changesets creates a release PR or publishes to npm if changesets exist
